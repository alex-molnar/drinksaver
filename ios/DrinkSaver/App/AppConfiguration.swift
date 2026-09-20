import Foundation

enum AppConfiguration {
    case local
    case test
    case release
    
    static var current: AppConfiguration {
        #if DEBUG
        return .local
        #else
        return .release
        #endif
    }
    
    var apiBaseURL: String {
        switch self {
        case .local:
            return "http://localhost:8080/api/v1"
        case .test:
            return "https://test.drinksaver.example.com/api/v1"
        case .release:
            return "https://api.drinksaver.example.com/api/v1"
        }
    }
}