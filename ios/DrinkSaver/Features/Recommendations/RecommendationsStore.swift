import Foundation
import Observation

@MainActor
@Observable
final class RecommendationsStore {
    enum State: Equatable { case loading, ready, failed }

    private(set) var state: State = .loading
    private(set) var draft = RecommendationDraft()
    private(set) var rows: [SavedRecommendation] = []
    private(set) var exitingRows: [Int: SavedRecommendation] = [:]
    private(set) var exitTokens: [Int: UUID] = [:]
    let queue: RecommendationQueue
    var visibleRows: [SavedRecommendation] {
        RecommendationDraftLogic.visibleRows(draft, rows: rows, hidden: queue.hiddenIDs)
    }
    var displayedRows: [SavedRecommendation] {
        draft.order.compactMap { id in
            visibleRows.first { $0.id == id } ?? exitingRows[id]
        }
    }
    var isDirty: Bool { RecommendationDraftLogic.isDirty(draft, hidden: queue.hiddenIDs) }
    var isSaving: Bool { queue.isSendingSave }

    private let api: (any DrinkSaverAPI)?
    private let session: SessionStore
    private let coordinator: AppCoordinator
    private var generation = 0
    private var isLoading = false

    init(api: (any DrinkSaverAPI)?, session: SessionStore, coordinator: AppCoordinator,
         queue: RecommendationQueue? = nil) {
        self.api = api; self.session = session; self.coordinator = coordinator
        self.queue = queue ?? RecommendationQueue(api: api)
        self.queue.onSaveUndone = { [weak self] snapshot in
            guard let self else { return }
            self.draft.order = snapshot.order; self.draft.names = snapshot.names; self.draft.committed = snapshot
        }
        self.queue.onSaveCommitted = { [weak self] recommendations in
            guard let self else { return }
            self.sync(recommendations)
            self.draft.committed = RecommendationSnapshot(order: self.draft.order, names: self.draft.names)
            self.coordinator.navigate(to: .quick)
        }
        self.queue.onDeleteCommitted = { [weak self] in await self?.load(force: true) }
    }

    func load() async { await load(force: false) }

    func rename(id: Int, to name: String) {
        guard !isSaving, draft.names[id] != nil else { return }
        draft.editingID = id; draft.editingValue = name
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty { draft.names[id] = trimmed }
        draft.editingID = nil; draft.editingValue = ""
    }

    func beginRename(id: Int) { guard !isSaving else { return }; draft.editingID = id; draft.editingValue = draft.names[id] ?? "" }
    func updateRename(_ value: String) { guard draft.isEditing, !isSaving else { return }; draft.editingValue = value }
    func commitRename() {
        guard let id = draft.editingID, !isSaving else { return }
        let value = draft.editingValue.trimmingCharacters(in: .whitespacesAndNewlines)
        if !value.isEmpty { draft.names[id] = value }
        draft.editingID = nil; draft.editingValue = ""
    }
    func cancelRename() { draft.editingID = nil; draft.editingValue = "" }

    func reorder(visibleIDs: [Int]) {
        guard !isSaving else { return }
        draft = RecommendationDraftLogic.reorder(draft, visibleOrder: visibleIDs, hidden: queue.hiddenIDs)
    }

    func move(id: Int, by offset: Int) {
        var ids = visibleRows.map(\.id)
        guard let index = ids.firstIndex(of: id) else { return }
        let destination = min(ids.count - 1, max(0, index + offset))
        guard destination != index else { return }
        ids.remove(at: index); ids.insert(id, at: destination)
        reorder(visibleIDs: ids)
    }

    func move(id: Int, before targetID: Int) {
        guard !isSaving else { return }
        draft = RecommendationDraftLogic.move(draft, id: id, before: targetID, hidden: queue.hiddenIDs)
    }

    func delete(id: Int, reduceMotion: Bool = false) {
        guard !isSaving, let row = visibleRows.first(where: { $0.id == id }) else { return }
        if !reduceMotion {
            let token = UUID()
            exitingRows[id] = row; exitTokens[id] = token
            Task { [weak self] in
                try? await Task.sleep(for: .milliseconds(350))
                self?.finishExit(id: id, token: token)
            }
        }
        queue.delete(id: id, label: row.name)
    }

    func finishExit(id: Int, token: UUID) {
        guard exitTokens[id] == token else { return }
        exitTokens[id] = nil; exitingRows[id] = nil
    }

    func cancel() {
        guard !isSaving else { return }
        draft.order = draft.committed.order; draft.names = draft.committed.names
        draft.editingID = nil; draft.editingValue = ""
    }

    func save() {
        guard isDirty, state == .ready, !isSaving else { return }
        let undoSnapshot = draft.committed
        draft.committed = RecommendationSnapshot(order: draft.order, names: draft.names)
        queue.save(snapshot: undoSnapshot) { [weak self] in
            guard let self else { return [] }
            return RecommendationDraftLogic.payload(self.draft, rows: self.rows, hidden: self.queue.hiddenIDs)
        }
    }

    func undoCurrent() { queue.undoCurrent() }
    func retryCurrent() { queue.retryCurrent() }

    func sessionDidSignOut() {
        queue.sessionDidSignOut()
        generation += 1; isLoading = false; rows = []; draft = RecommendationDraft(); exitingRows = [:]; exitTokens = [:]; state = .loading
    }

    private func load(force: Bool) async {
        guard !isLoading, let userID = session.userID, let api else { if api == nil { state = .failed }; return }
        generation += 1; let request = generation
        isLoading = true; state = .loading
        defer { isLoading = false }
        do {
            let response = try await api.recommendations()
            guard generation == request, session.userID == userID else { return }
            sync(response)
            state = .ready
        } catch {
            guard generation == request, session.userID == userID else { return }
            state = .failed
        }
    }

    private func sync(_ response: [Recommendation]) {
        guard let userID = session.userID else { return }
        rows = Self.savedRows(from: response, userID: userID)
        draft = RecommendationDraftLogic.sync(draft, rows: rows, hidden: queue.hiddenIDs)
    }

    nonisolated static func savedRows(from response: [Recommendation], userID: String) -> [SavedRecommendation] {
        response.compactMap { recommendation in
            guard let id = recommendation.id, recommendation.userId == userID else { return nil }
            return SavedRecommendation(id: id, name: recommendation.name)
        }
    }
}
