import Foundation

struct AppConfiguration: Equatable, Sendable {
    enum Environment: String, Sendable {
        case local
        case test
        case production
    }

    enum ConfigurationError: Error, Equatable {
        case missing(key: String)
        case invalid(key: String)
    }

    let environment: Environment
    let apiBaseURL: URL
    let issuerURL: URL
    let clientID: String
    let redirectURL: URL

    static func load(bundle: Bundle = .main) throws -> AppConfiguration {
        let info = bundle.infoDictionary ?? [:]
        let environmentName = try value("APP_ENVIRONMENT", from: info)
        guard let environment = Environment(rawValue: environmentName) else {
            throw ConfigurationError.invalid(key: "APP_ENVIRONMENT")
        }

        let apiString = try value("API_BASE_URL", from: info)
        let issuerString = try value("OIDC_ISSUER_URL", from: info)
        let clientID = try value("OIDC_CLIENT_ID", from: info)
        let redirectString = try value("OIDC_REDIRECT_URL", from: info)

        let expected: (api: String, issuer: String, clientID: String)
        switch environment {
        case .local:
            expected = ("http://localhost:8080", "http://localhost:8081/auth/realms/drinksaver", "drinksaver-ios-local")
        case .test:
            expected = ("https://test.api.drinksaver.kak.im", "https://auth.drinksaver.kak.im/auth/realms/test-drinksaver", "drinksaver-ios-test")
        case .production:
            expected = ("https://api.drinksaver.kak.im", "https://auth.drinksaver.kak.im/auth/realms/drinksaver", "drinksaver-ios")
        }

        guard apiString == expected.api else { throw ConfigurationError.invalid(key: "API_BASE_URL") }
        guard issuerString == expected.issuer else { throw ConfigurationError.invalid(key: "OIDC_ISSUER_URL") }
        guard clientID == expected.clientID else { throw ConfigurationError.invalid(key: "OIDC_CLIENT_ID") }
        guard redirectString == "im.kak.drinksaver:/oauth2redirect" else {
            throw ConfigurationError.invalid(key: "OIDC_REDIRECT_URL")
        }

        guard let apiBaseURL = URL(string: apiString), let issuerURL = URL(string: issuerString),
              let redirectURL = URL(string: redirectString) else {
            throw ConfigurationError.invalid(key: "API_BASE_URL")
        }
        return AppConfiguration(environment: environment, apiBaseURL: apiBaseURL, issuerURL: issuerURL,
                                clientID: clientID, redirectURL: redirectURL)
    }

    private static func value(_ key: String, from info: [String: Any]) throws -> String {
        guard let value = info[key] as? String, !value.isEmpty, !value.hasPrefix("$(") else {
            throw ConfigurationError.missing(key: key)
        }
        return value
    }
}
