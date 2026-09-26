import Foundation

struct SavedRecommendation: Identifiable, Equatable {
    let id: Int
    var name: String
}

struct RecommendationSnapshot: Equatable {
    var order: [Int]
    var names: [Int: String]
}

struct RecommendationDraft: Equatable {
    var order: [Int] = []
    var names: [Int: String] = [:]
    var committed = RecommendationSnapshot(order: [], names: [:])
    var editingID: Int?
    var editingValue = ""

    var isEditing: Bool { editingID != nil }
}

enum RecommendationDraftLogic {
    static func sync(_ draft: RecommendationDraft, rows: [SavedRecommendation], hidden: Set<Int> = []) -> RecommendationDraft {
        let server = Dictionary(uniqueKeysWithValues: rows.map { ($0.id, $0.name) })
        if !draft.isEditing && !isDirty(draft, hidden: hidden) {
            let order = rows.map(\.id)
            let names = Dictionary(uniqueKeysWithValues: rows.map { ($0.id, $0.name) })
            return RecommendationDraft(order: order, names: names,
                committed: RecommendationSnapshot(order: order, names: names))
        }
        let oldIDs = Set(draft.order)
        let order = draft.order.filter { server[$0] != nil } + rows.map(\.id).filter { !oldIDs.contains($0) }
        let names = Dictionary(uniqueKeysWithValues: order.map { ($0, draft.names[$0] ?? server[$0]!) })
        let committedNames = Dictionary(uniqueKeysWithValues: order.map { ($0, draft.committed.names[$0] ?? server[$0]!) })
        let committedOrder = draft.committed.order.filter { server[$0] != nil } + rows.map(\.id).filter { !draft.committed.order.contains($0) }
        return RecommendationDraft(order: order, names: names,
            committed: RecommendationSnapshot(order: committedOrder, names: committedNames),
            editingID: draft.editingID.flatMap { server[$0] == nil ? nil : $0 },
            editingValue: draft.editingID.flatMap { server[$0] == nil ? nil : draft.editingValue } ?? "")
    }

    static func visibleRows(_ draft: RecommendationDraft, rows: [SavedRecommendation], hidden: Set<Int>) -> [SavedRecommendation] {
        let sources = Dictionary(uniqueKeysWithValues: rows.map { ($0.id, $0.name) })
        return draft.order.filter { !hidden.contains($0) }.compactMap { id in
            guard sources[id] != nil, let name = draft.names[id] else { return nil }
            return SavedRecommendation(id: id, name: name)
        }
    }

    static func isDirty(_ draft: RecommendationDraft, hidden: Set<Int>) -> Bool {
        let live = draft.order.filter { !hidden.contains($0) }
        let saved = draft.committed.order.filter { !hidden.contains($0) }
        return live != saved || live.contains { draft.names[$0] != draft.committed.names[$0] }
    }

    static func reorder(_ draft: RecommendationDraft, visibleOrder: [Int], hidden: Set<Int>) -> RecommendationDraft {
        let allowed = draft.order.filter { !hidden.contains($0) }
        guard visibleOrder.count == allowed.count, Set(visibleOrder) == Set(allowed) else { return draft }
        var iterator = visibleOrder.makeIterator()
        var next = draft
        next.order = draft.order.map { hidden.contains($0) ? $0 : iterator.next()! }
        return next
    }

    static func move(_ draft: RecommendationDraft, id: Int, before targetID: Int, hidden: Set<Int>) -> RecommendationDraft {
        var ids = draft.order.filter { !hidden.contains($0) }
        guard let source = ids.firstIndex(of: id), let target = ids.firstIndex(of: targetID), source != target else { return draft }
        ids.remove(at: source)
        ids.insert(id, at: source < target ? target - 1 : target)
        return reorder(draft, visibleOrder: ids, hidden: hidden)
    }

    static func payload(_ draft: RecommendationDraft, rows: [SavedRecommendation], hidden: Set<Int>) -> [RecommendationEdit] {
        visibleRows(draft, rows: rows, hidden: hidden).map { RecommendationEdit(id: $0.id, name: $0.name) }
    }
}
