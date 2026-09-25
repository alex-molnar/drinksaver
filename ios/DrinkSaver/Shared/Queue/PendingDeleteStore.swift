import Foundation

struct PendingDeleteRecord: Codable, Equatable, Sendable {
    let operationID: UUID
    let drinkIDs: [Int]
    let environment: AppConfiguration.Environment
    let issuer: URL
    let subject: String
}

struct PendingDeleteStore: Sendable {
    private let fileURL: URL

    init(fileURL: URL? = nil) {
        self.fileURL = fileURL ?? FileManager.default
            .urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("DrinkSaver", isDirectory: true)
            .appendingPathComponent("pending-deletes.json")
    }

    func records() throws -> [PendingDeleteRecord] {
        guard FileManager.default.fileExists(atPath: fileURL.path) else { return [] }
        return try JSONDecoder().decode([PendingDeleteRecord].self, from: Data(contentsOf: fileURL))
    }

    func insert(_ record: PendingDeleteRecord) throws {
        var current = try records()
        current.removeAll { $0.operationID == record.operationID }
        current.append(record)
        try persist(current)
    }

    func remove(operationID: UUID) throws {
        try persist(records().filter { $0.operationID != operationID })
    }

    private func persist(_ records: [PendingDeleteRecord]) throws {
        let manager = FileManager.default
        let directory = fileURL.deletingLastPathComponent()
        try manager.createDirectory(at: directory, withIntermediateDirectories: true)
        if records.isEmpty {
            try? manager.removeItem(at: fileURL)
            return
        }
        let data = try JSONEncoder().encode(records)
        try data.write(to: fileURL, options: [.atomic, .completeFileProtectionUnlessOpen])
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        var mutableURL = fileURL
        try mutableURL.setResourceValues(values)
    }
}
