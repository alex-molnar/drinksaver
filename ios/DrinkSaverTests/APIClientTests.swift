import Foundation
import XCTest
@testable import DrinkSaver

final class APIClientTests: XCTestCase {
    @MainActor
    func testEveryEndpointUsesExpectedRequestContract() async throws {
        let tokens = TestAccessTokenProvider(tokens: ["test-access-token"])
        let client = makeClient(tokens: tokens, handler: { Self.response(for: $0) })

        _ = try await client.saveDrink(DrinkSaveRequest(alcoholTypeId: 1, alcoholVolumeId: 2, colorPaletteId: 3, glasswareId: 4, quantity: 2))
        _ = try await client.recommendations()
        _ = try await client.editRecommendations([RecommendationEdit(id: 4, name: "New name")])
        try await client.deleteRecommendation(id: 4)
        _ = try await client.alcoholTypes()
        _ = try await client.createAlcoholType(NewAlcoholEntry(name: "Cider", volumes: [NewVolumeEntry(name: "Bottle", volume: 0.33)], alcoholSubtypes: ["Dry"], colorPaletteId: 2, glasswareId: 4))
        _ = try await client.volumes(alcoholTypeID: 1)
        _ = try await client.createVolume(alcoholTypeID: 1, entry: NewVolumeEntry(name: "Glass", volume: 0.25))
        _ = try await client.subtypes(alcoholTypeID: 1)
        _ = try await client.createSubtype(alcoholTypeID: 1, entry: NewAlcoholSubtype(alcoholTypeId: 1, name: "Dry", colorPaletteId: 2, glasswareId: 4))
        _ = try await client.consumptionTypes(amount: 100)
        _ = try await client.brands()
        _ = try await client.createBrand(NewBeerBrand(name: "House", flavours: ["Stout"], colorPaletteId: 2))
        _ = try await client.flavours(brandID: 3)
        _ = try await client.createFlavour(brandID: 3, entry: NewBeerFlavour(name: "Stout", colorPaletteId: 2))
        _ = try await client.palettes()
        _ = try await client.glassware()
        _ = try await client.drinks(date: "2026-09-25")
        let deleted = try await client.deleteDrinks(ids: [1, 2])

        let requests = URLProtocolStub.capturedRequests()
        let expected: [(String, String, Bool)] = [
            ("POST", "/v1/drinks/new", true),
            ("GET", "/v1/recommendations/list", false),
            ("PATCH", "/v1/recommendations/edit", true),
            ("DELETE", "/v1/recommendations/4", false),
            ("GET", "/v1/alcohol/types", false),
            ("POST", "/v1/alcohol/types", true),
            ("GET", "/v1/alcohol/types/1/volumes", false),
            ("POST", "/v1/alcohol/types/1/volumes", true),
            ("GET", "/v1/alcohol/types/1/subtypes", false),
            ("POST", "/v1/alcohol/types/1/subtypes", true),
            ("GET", "/v1/beer/consumption-types", false),
            ("GET", "/v1/beer/brands", false),
            ("POST", "/v1/beer/brands", true),
            ("GET", "/v1/beer/brands/3/flavours", false),
            ("POST", "/v1/beer/brands/3/flavours", true),
            ("GET", "/v1/design/color-palettes", false),
            ("GET", "/v1/design/glassware", false),
            ("GET", "/v1/drinks/date/2026-09-25", false),
            ("DELETE", "/v1/drinks/byIds", false),
        ]
        XCTAssertEqual(requests.count, expected.count)
        for (request, contract) in zip(requests, expected) {
            XCTAssertEqual(request.httpMethod, contract.0)
            XCTAssertEqual(request.url?.path, contract.1)
            XCTAssertEqual(request.timeoutInterval, 10)
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer test-access-token")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), contract.2 ? "application/json" : nil)
        }
        let expectedBodies: [Int: Any] = [
            0: ["alcoholTypeId": 1, "alcoholVolumeId": 2, "quantity": 2, "colorPaletteId": 3, "glasswareId": 4],
            2: [["id": 4, "name": "New name"]],
            5: ["name": "Cider", "volumes": [["name": "Bottle", "volume": 0.33]], "alcoholSubtypes": ["Dry"], "colorPaletteId": 2, "glasswareId": 4],
            7: ["name": "Glass", "volume": 0.25],
            9: ["alcoholTypeId": 1, "name": "Dry", "colorPaletteId": 2, "glasswareId": 4],
            12: ["name": "House", "flavours": ["Stout"], "colorPaletteId": 2],
            14: ["name": "Stout", "colorPaletteId": 2]
        ]
        for (index, expectedBody) in expectedBodies {
            let body = try XCTUnwrap(requests[index].httpBody, "No JSON body for request at index \(index)")
            let actualBody = try JSONSerialization.jsonObject(with: body)
            if let expectedDictionary = expectedBody as? [String: Any] {
                XCTAssertTrue((actualBody as? NSDictionary)?.isEqual(to: expectedDictionary) == true, "Unexpected JSON body for request at index \(index)")
            } else if let expectedArray = expectedBody as? [[String: Any]] {
                XCTAssertTrue((actualBody as? NSArray)?.isEqual(to: expectedArray) == true, "Unexpected JSON body for request at index \(index)")
            }
            XCTAssertFalse(String(decoding: body, as: UTF8.self).contains("userId"))
        }
        XCTAssertEqual(queryItems(for: requests[10]), [URLQueryItem(name: "amount", value: "100")])
        XCTAssertEqual(queryItems(for: requests[18]), [
            URLQueryItem(name: "drinkIds", value: "1"), URLQueryItem(name: "drinkIds", value: "2")
        ])
        XCTAssertEqual(deleted, 1)
        XCTAssertEqual(tokens.calls, [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false])
    }

    @MainActor
    func testUnauthorizedRequestRefreshesOnceAndReplaysOnce() async throws {
        let tokens = TestAccessTokenProvider(tokens: ["expired", "fresh"])
        let client = makeClient(tokens: tokens, handler: { request in
            let status = request.value(forHTTPHeaderField: "Authorization") == "Bearer expired" ? 401 : 200
            return StubbedHTTPResponse(statusCode: status)
        })

        _ = try await client.recommendations()

        XCTAssertEqual(tokens.calls, [false, true])
        XCTAssertEqual(URLProtocolStub.capturedRequests().map { $0.value(forHTTPHeaderField: "Authorization") }, ["Bearer expired", "Bearer fresh"])
    }

    @MainActor
    func testSecondUnauthorizedResponseDoesNotLoop() async throws {
        let tokens = TestAccessTokenProvider(tokens: ["first", "refreshed"])
        let client = makeClient(tokens: tokens, handler: { _ in StubbedHTTPResponse(statusCode: 401) })

        do {
            _ = try await client.recommendations()
            XCTFail("Expected a 401 API error")
        } catch let error as APIError {
            XCTAssertEqual(error, .client(401))
        }
        XCTAssertEqual(tokens.calls, [false, true])
        XCTAssertEqual(URLProtocolStub.capturedRequests().count, 2)
    }

    @MainActor
    func testHTTPStatusErrorsDoNotRetainResponseBodies() async throws {
        let tokens = TestAccessTokenProvider(tokens: ["private-token"])
        let client = makeClient(tokens: tokens, handler: { request in
            let status = request.url?.path == "/v1/recommendations/list" ? 400 : 503
            return StubbedHTTPResponse(statusCode: status, body: Data("private-token response details".utf8))
        })

        do {
            _ = try await client.recommendations()
            XCTFail("Expected a client error")
        } catch let error as APIError {
            XCTAssertEqual(error, .client(400))
            XCTAssertFalse(String(describing: error).contains("private-token"))
            XCTAssertFalse(String(describing: error).contains("response details"))
        }
        do {
            _ = try await client.alcoholTypes()
            XCTFail("Expected a server error")
        } catch let error as APIError {
            XCTAssertEqual(error, .server(503))
        }
    }

    @MainActor
    func testTimeoutAndNoNetworkRemainDistinct() async throws {
        for (urlError, expected) in [(URLError(.timedOut), APIError.timeout), (URLError(.notConnectedToInternet), APIError.connection)] {
            let client = makeClient(tokens: TestAccessTokenProvider(tokens: ["test"]), throwing: urlError)
            do {
                _ = try await client.recommendations()
                XCTFail("Expected transport error")
            } catch let error as APIError {
                XCTAssertEqual(error, expected)
            }
        }
    }

    @MainActor
    func testDecodingErrorsDoNotExposeBodyOrToken() async throws {
        let client = makeClient(tokens: TestAccessTokenProvider(tokens: ["secret-token"]), response: StubbedHTTPResponse(body: Data("secret-token malformed body".utf8)))
        do {
            _ = try await client.recommendations()
            XCTFail("Expected a decoding error")
        } catch let error as APIError {
            XCTAssertEqual(error, .decoding)
            XCTAssertFalse(String(describing: error).contains("secret-token"))
            XCTAssertFalse(String(describing: error).contains("malformed body"))
        }
    }

    @MainActor
    private func makeClient(
        tokens: TestAccessTokenProvider,
        response: StubbedHTTPResponse = StubbedHTTPResponse(),
        throwing error: URLError? = nil
    ) -> APIClient {
        makeClient(tokens: tokens, handler: { _ in
            if let error { throw error }
            return response
        })
    }

    @MainActor
    private func makeClient(tokens: TestAccessTokenProvider, handler: @escaping URLProtocolStub.Handler) -> APIClient {
        URLProtocolStub.install(handler)
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [URLProtocolStub.self]
        return APIClient(baseURL: URL(string: "https://api.example.test")!, accessTokenProvider: tokens, session: URLSession(configuration: configuration))
    }

    private func queryItems(for request: URLRequest) -> [URLQueryItem]? {
        guard let url = request.url else { return nil }
        return URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems
    }

    private static func response(for request: URLRequest) -> StubbedHTTPResponse {
        let path = request.url?.path ?? ""
        let body: String
        switch (request.httpMethod, path) {
        case ("POST", "/v1/alcohol/types"):
            body = #"{"id":1,"name":"Cider","volumeIds":[],"colorPaletteId":2,"glasswareId":4}"#
        case ("POST", "/v1/alcohol/types/1/volumes"):
            body = #"{"id":1,"name":"Glass","volume":0.25}"#
        case ("POST", "/v1/alcohol/types/1/subtypes"):
            body = #"{"id":1,"alcoholTypeId":1,"name":"Dry"}"#
        case ("POST", "/v1/beer/brands"):
            body = #"{"id":3,"name":"House"}"#
        case ("POST", "/v1/beer/brands/3/flavours"):
            body = #"{"id":4,"brandId":3,"name":"Stout"}"#
        case ("DELETE", "/v1/drinks/byIds"):
            body = "1"
        default:
            body = "[]"
        }
        return StubbedHTTPResponse(body: Data(body.utf8))
    }
}

@MainActor
private final class TestAccessTokenProvider: AccessTokenProviding {
    private let tokens: [String]
    private(set) var calls: [Bool] = []

    init(tokens: [String]) { self.tokens = tokens }

    func accessToken(forceRefresh: Bool) async throws -> String {
        calls.append(forceRefresh)
        return tokens[min(calls.count - 1, tokens.count - 1)]
    }
}
