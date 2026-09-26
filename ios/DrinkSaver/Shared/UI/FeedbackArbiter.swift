import Observation
import UIKit

enum FeedbackSource: Hashable {
    case drinks
    case recommendations
}

struct FeedbackItem: Equatable, Identifiable {
    enum State: Equatable { case undoable, undoing, retryable, progress }
    let id: UUID
    let source: FeedbackSource
    let sequence: Int
    let message: String
    let state: State
}

@MainActor
@Observable
final class FeedbackArbiter {
    private struct Submission {
        var item: FeedbackItem
        var order: Int
    }

    private var submissions: [FeedbackSource: Submission] = [:]
    private var sourceIDs: [FeedbackSource: UUID] = [:]
    private var order = 0
    private(set) var isInteractionActive = false

    var current: FeedbackItem? {
        submissions.values.max { $0.order < $1.order }?.item
    }

    func refresh(drinks entry: QueueEntry?, recommendations: RecommendationQueue.FeedbackSnapshot?) {
        if let entry {
            let item = Self.item(for: entry)
            submit(item, from: .drinks)
        } else {
            clear(.drinks)
        }
        if let recommendations {
            submit(Self.item(for: recommendations), from: .recommendations)
        } else {
            clear(.recommendations)
        }
    }

    func setInteractionActive(_ active: Bool) { isInteractionActive = active }

    func performCurrentAction(drinks: SaveQueueStore?, recommendations: RecommendationsStore?) {
        guard let current else { return }
        switch current.source {
        case .drinks:
            if current.state == .undoable { drinks?.undoCurrent() }
            if current.state == .retryable { drinks?.retryCurrent() }
        case .recommendations:
            if current.state == .undoable { recommendations?.undoCurrent() }
            if current.state == .retryable { recommendations?.retryCurrent() }
        }
    }

    private func submit(_ item: FeedbackItem, from source: FeedbackSource) {
        let previous = submissions[source]?.item
        if sourceIDs[source] != item.id {
            order += 1
            sourceIDs[source] = item.id
        }
        if previous?.message != item.message {
            UIAccessibility.post(notification: .announcement, argument: item.message)
        }
        let currentOrder = submissions[source]?.order ?? order
        submissions[source] = Submission(item: item, order: currentOrder)
    }

    private func clear(_ source: FeedbackSource) {
        submissions[source] = nil
        sourceIDs[source] = nil
    }

    private static func item(for entry: QueueEntry) -> FeedbackItem {
        let label: String
        switch entry.kind {
        case .save(let operation): label = operation.label
        case .delete(let operation): label = operation.label
        }
        let message: String
        let state: FeedbackItem.State
        switch entry.status {
        case .undoable:
            let action: String
            if case .delete = entry.kind { action = "Crossed off" } else { action = "Saved" }
            message = "\(action) \(label)"
            state = .undoable
        case .undoing:
            message = "Undoing \(label)…"
            state = .undoing
        case .failed(let failure):
            message = failure.message
            state = .retryable
        case .saving:
            if case .delete = entry.kind {
                message = "Deleting \(label)…"
            } else {
                message = "Saving \(label)…"
            }
            state = .progress
        case .committed:
            message = ""
            state = .progress
        }
        return FeedbackItem(id: entry.id, source: .drinks, sequence: entry.sequence, message: message, state: state)
    }

    private static func item(for snapshot: RecommendationQueue.FeedbackSnapshot) -> FeedbackItem {
        let message: String
        let state: FeedbackItem.State
        switch snapshot.state {
        case .undoable:
            message = snapshot.isDelete ? "Crossed off \(snapshot.label)" : "Saved recommendation changes"
            state = .undoable
        case .undoing:
            message = snapshot.isDelete ? "Undoing \(snapshot.label)…" : "Undoing recommendation changes…"
            state = .undoing
        case .failed(let value):
            message = value
            state = .retryable
        case .sending:
            message = "Updating recommendations…"
            state = .progress
        }
        return FeedbackItem(id: snapshot.id, source: .recommendations, sequence: snapshot.sequence, message: message, state: state)
    }
}
