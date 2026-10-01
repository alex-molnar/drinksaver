import Foundation

struct HTTPStatusError: Error, Equatable {
    let statusCode: Int
}
