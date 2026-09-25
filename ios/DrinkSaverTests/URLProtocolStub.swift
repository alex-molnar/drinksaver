import Foundation

struct StubbedHTTPResponse: Sendable {
    let statusCode: Int
    let headers: [String: String]
    let body: Data

    init(statusCode: Int = 200, headers: [String: String] = ["Content-Type": "application/json"], body: Data = Data("[]".utf8)) {
        self.statusCode = statusCode
        self.headers = headers
        self.body = body
    }
}

final class URLProtocolStub: URLProtocol {
    typealias Handler = @Sendable (URLRequest) throws -> StubbedHTTPResponse

    private static let lock = NSLock()
    nonisolated(unsafe) private static var handler: Handler?
    nonisolated(unsafe) private static var requests: [URLRequest] = []

    static func install(_ newHandler: @escaping Handler) {
        lock.lock()
        handler = newHandler
        requests = []
        lock.unlock()
    }

    static func capturedRequests() -> [URLRequest] {
        lock.lock()
        defer { lock.unlock() }
        return requests
    }

    override class func canInit(with request: URLRequest) -> Bool { true }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        let capturedRequest = Self.requestWithReadableBody(request)
        Self.lock.lock()
        let currentHandler = Self.handler
        Self.requests.append(capturedRequest)
        Self.lock.unlock()

        do {
            guard let currentHandler else { throw URLError(.unknown) }
            let result = try currentHandler(request)
            guard let url = request.url,
                  let response = HTTPURLResponse(
                    url: url,
                    statusCode: result.statusCode,
                    httpVersion: "HTTP/1.1",
                    headerFields: result.headers
                  ) else { throw URLError(.badServerResponse) }
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            if !result.body.isEmpty { client?.urlProtocol(self, didLoad: result.body) }
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}

    private static func requestWithReadableBody(_ request: URLRequest) -> URLRequest {
        guard let stream = request.httpBodyStream else { return request }
        stream.open()
        defer { stream.close() }

        var body = Data()
        var buffer = [UInt8](repeating: 0, count: 1_024)
        while stream.hasBytesAvailable {
            let count = stream.read(&buffer, maxLength: buffer.count)
            if count <= 0 { break }
            body.append(buffer, count: count)
        }

        var capturedRequest = request
        capturedRequest.httpBody = body
        return capturedRequest
    }
}
