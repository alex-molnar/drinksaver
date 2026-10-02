import Foundation
import OSLog

actor APIClient: DrinkSaverAPI {
    private let logger = Logger(subsystem: "im.kak.drinksaver", category: "API")
    private let baseURL: URL
    private let accessTokenProvider: any AccessTokenProviding
    private let session: URLSession

    init(baseURL: URL, accessTokenProvider: any AccessTokenProviding, session: URLSession? = nil) {
        self.baseURL = baseURL
        self.accessTokenProvider = accessTokenProvider
        if let session {
            self.session = session
        } else {
            let configuration = URLSessionConfiguration.ephemeral
            configuration.timeoutIntervalForRequest = 10
            self.session = URLSession(configuration: configuration)
        }
    }

    func saveDrink(_ request: DrinkSaveRequest) async throws -> [SavedDrink] {
        try await send(method: "POST", path: "/v1/drinks/new", body: jsonBody(request))
    }

    func recommendations() async throws -> [Recommendation] {
        try await send(method: "GET", path: "/v1/recommendations/list")
    }

    func editRecommendations(_ edits: [RecommendationEdit]) async throws -> [Recommendation] {
        try await send(method: "PATCH", path: "/v1/recommendations/edit", body: jsonBody(edits))
    }

    func deleteRecommendation(id: Int) async throws {
        let _: EmptyAPIResponse = try await send(method: "DELETE", path: "/v1/recommendations/\(id)")
    }

    func alcoholTypes() async throws -> [AlcoholType] {
        try await send(method: "GET", path: "/v1/alcohol/types")
    }

    func createAlcoholType(_ entry: NewAlcoholEntry) async throws -> AlcoholType {
        try await send(method: "POST", path: "/v1/alcohol/types", body: jsonBody(entry))
    }

    func volumes(alcoholTypeID: Int) async throws -> [AlcoholVolume] {
        try await send(method: "GET", path: "/v1/alcohol/types/\(alcoholTypeID)/volumes")
    }

    func createVolume(alcoholTypeID: Int, entry: NewVolumeEntry) async throws -> AlcoholVolume {
        try await send(method: "POST", path: "/v1/alcohol/types/\(alcoholTypeID)/volumes", body: jsonBody(entry))
    }

    func subtypes(alcoholTypeID: Int) async throws -> [AlcoholSubtype] {
        try await send(method: "GET", path: "/v1/alcohol/types/\(alcoholTypeID)/subtypes")
    }

    func createSubtype(alcoholTypeID: Int, entry: NewAlcoholSubtype) async throws -> AlcoholSubtype {
        try await send(method: "POST", path: "/v1/alcohol/types/\(alcoholTypeID)/subtypes", body: jsonBody(entry))
    }

    func consumptionTypes(amount: Int) async throws -> [ConsumptionType] {
        try await send(method: "GET", path: "/v1/beer/consumption-types", query: [URLQueryItem(name: "amount", value: String(amount))])
    }

    func brands() async throws -> [Brand] {
        try await send(method: "GET", path: "/v1/beer/brands")
    }

    func createBrand(_ entry: NewBeerBrand) async throws -> Brand {
        try await send(method: "POST", path: "/v1/beer/brands", body: jsonBody(entry))
    }

    func flavours(brandID: Int) async throws -> [BeerFlavour] {
        try await send(method: "GET", path: "/v1/beer/brands/\(brandID)/flavours")
    }

    func createFlavour(brandID: Int, entry: NewBeerFlavour) async throws -> BeerFlavour {
        try await send(method: "POST", path: "/v1/beer/brands/\(brandID)/flavours", body: jsonBody(entry))
    }

    func palettes() async throws -> [Palette] {
        try await send(method: "GET", path: "/v1/design/color-palettes")
    }

    func glassware() async throws -> [Glassware] {
        try await send(method: "GET", path: "/v1/design/glassware")
    }

    func drinks(date: String) async throws -> [EditableDrink] {
        try await send(method: "GET", path: "/v1/drinks/date/\(date)")
    }

    func deleteDrinks(ids: [Int]) async throws -> Int {
        let query = ids.map { URLQueryItem(name: "drinkIds", value: String($0)) }
        return try await send(method: "DELETE", path: "/v1/drinks/byIds", query: query)
    }

    private func send<Response: Decodable>(
        method: String,
        path: String,
        query: [URLQueryItem] = [],
        body: Data? = nil
    ) async throws -> Response {
        let request = try makeRequest(method: method, path: path, query: query, body: body)
        let firstResponse = try await perform(request, forceRefresh: false)
        let response = firstResponse.statusCode == 401
            ? try await perform(request, forceRefresh: true)
            : firstResponse
        guard (200..<300).contains(response.statusCode) else {
            logger.error("API \(method, privacy: .public) \(Self.safeRoute(path), privacy: .public) on \(self.baseURL.host ?? "unknown", privacy: .public) returned HTTP \(response.statusCode)")
            throw APIError.status(response.statusCode)
        }
        if Response.self == EmptyAPIResponse.self, let empty = EmptyAPIResponse() as? Response { return empty }
        do {
            return try JSONDecoder().decode(Response.self, from: response.data)
        } catch let error as DecodingError {
            logger.error("API \(method, privacy: .public) \(Self.safeRoute(path), privacy: .public) response from \(self.baseURL.host ?? "unknown", privacy: .public) could not be decoded at \(Self.decodingPath(error), privacy: .public)")
            throw APIError.decoding
        } catch {
            logger.error("API \(method, privacy: .public) \(Self.safeRoute(path), privacy: .public) response from \(self.baseURL.host ?? "unknown", privacy: .public) could not be decoded")
            throw APIError.decoding
        }
    }

    private func makeRequest(method: String, path: String, query: [URLQueryItem], body: Data?) throws -> URLRequest {
        guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else {
            throw APIError.invalidURL
        }
        components.path = path
        components.queryItems = query.isEmpty ? nil : query
        guard let url = components.url else { throw APIError.invalidURL }
        var request = URLRequest(url: url, timeoutInterval: 10)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        return request
    }

    private func perform(_ request: URLRequest, forceRefresh: Bool) async throws -> (data: Data, statusCode: Int) {
        var authenticatedRequest = request
        do {
            let token = try await accessTokenProvider.accessToken(forceRefresh: forceRefresh)
            authenticatedRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        } catch {
            logger.error("API \(request.httpMethod ?? "?", privacy: .public) \(Self.safeRoute(request.url?.path ?? ""), privacy: .public) token acquisition failed for \(request.url?.host ?? "unknown", privacy: .public)")
            throw APIError.authentication
        }

        do {
            let (data, response) = try await session.data(for: authenticatedRequest)
            guard let response = response as? HTTPURLResponse else { throw APIError.invalidResponse }
            return (data, response.statusCode)
        } catch let error as APIError {
            throw error
        } catch let error as URLError {
            logger.error("API \(request.httpMethod ?? "?", privacy: .public) \(Self.safeRoute(request.url?.path ?? ""), privacy: .public) request to \(request.url?.host ?? "unknown", privacy: .public) failed with URLError code \(error.code.rawValue)")
            throw APIError.transport(error)
        } catch {
            logger.error("API \(request.httpMethod ?? "?", privacy: .public) \(Self.safeRoute(request.url?.path ?? ""), privacy: .public) request to \(request.url?.host ?? "unknown", privacy: .public) failed with a non-URL transport error")
            throw APIError.transport(error)
        }
    }

    private func jsonBody<Value: Encodable>(_ value: Value) throws -> Data {
        do {
            return try JSONEncoder().encode(value)
        } catch {
            throw APIError.encoding
        }
    }

    private static func safeRoute(_ path: String) -> String {
        let segments = path.split(separator: "/").map { segment -> String in
            if Int(segment) != nil { return "{id}" }
            let characters = Array(segment)
            if characters.count == 10,
               characters[4] == "-", characters[7] == "-",
               characters.enumerated().allSatisfy({ [4, 7].contains($0.offset) || $0.element.isNumber }) {
                return "{date}"
            }
            return String(segment)
        }
        return "/" + segments.joined(separator: "/")
    }

    private static func decodingPath(_ error: DecodingError) -> String {
        let context: DecodingError.Context
        switch error {
        case .keyNotFound(let key, let decodingContext):
            context = decodingContext
            return (context.codingPath + [key]).map(\.stringValue).joined(separator: ".")
        case .typeMismatch(_, let decodingContext), .valueNotFound(_, let decodingContext), .dataCorrupted(let decodingContext):
            context = decodingContext
        @unknown default:
            return "unknown"
        }
        return context.codingPath.map(\.stringValue).joined(separator: ".")
    }
}

private struct EmptyAPIResponse: Decodable {
    init() {}
    init(from decoder: Decoder) throws {}
}
