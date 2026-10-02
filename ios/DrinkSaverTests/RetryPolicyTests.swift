import Foundation
import XCTest
@testable import DrinkSaver

final class RetryPolicyTests: XCTestCase {
    func testTimeoutIsClassifiedSeparatelyFromConnectionErrors() {
        XCTAssertEqual(RetryPolicy.classify(URLError(.timedOut)), .timeout)
        XCTAssertEqual(RetryPolicy.classify(URLError(.notConnectedToInternet)), .connection)
        XCTAssertEqual(RetryPolicy.classify(URLError(.cannotConnectToHost)), .connection)
        XCTAssertEqual(RetryPolicy.classify(URLError(.cannotFindHost)), .connection)
        XCTAssertEqual(RetryPolicy.classify(URLError(.networkConnectionLost)), .connection)
        XCTAssertEqual(RetryPolicy.classify(URLError(.dnsLookupFailed)), .connection)
    }

    func testHTTPClientAndServerResponsesRetainTheirStatusCodes() {
        XCTAssertEqual(RetryPolicy.classify(HTTPStatusError(statusCode: 400)), .client(400))
        XCTAssertEqual(RetryPolicy.classify(HTTPStatusError(statusCode: 404)), .client(404))
        XCTAssertEqual(RetryPolicy.classify(HTTPStatusError(statusCode: 499)), .client(499))
        XCTAssertEqual(RetryPolicy.classify(HTTPStatusError(statusCode: 500)), .server(500))
        XCTAssertEqual(RetryPolicy.classify(HTTPStatusError(statusCode: 503)), .server(503))
        XCTAssertEqual(RetryPolicy.classify(HTTPStatusError(statusCode: 599)), .server(599))
    }

    func testUnexpectedStatusAndUnrelatedErrorAreUnknown() {
        XCTAssertEqual(RetryPolicy.classify(HTTPStatusError(statusCode: 399)), .unknown)
        XCTAssertEqual(RetryPolicy.classify(HTTPStatusError(statusCode: 600)), .unknown)
        XCTAssertEqual(RetryPolicy.classify(URLError(.cancelled)), .unknown)
        XCTAssertEqual(RetryPolicy.classify(TestError.failure), .unknown)
    }

    private enum TestError: Error {
        case failure
    }
}
