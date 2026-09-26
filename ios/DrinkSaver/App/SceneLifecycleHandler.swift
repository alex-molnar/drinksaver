import Foundation

@MainActor
final class SceneLifecycleHandler {
    private let saveQueueStore: SaveQueueStore
    private let recommendationQueue: RecommendationQueue

    init(saveQueueStore: SaveQueueStore, recommendationQueue: RecommendationQueue) {
        self.saveQueueStore = saveQueueStore
        self.recommendationQueue = recommendationQueue
    }

    func didBecomeActive() async {
        saveQueueStore.applicationDidBecomeActive()
        saveQueueStore.expireDueEntries()
        recommendationQueue.expireDueEntries()
        await saveQueueStore.reconcilePersistedDeletes()
    }

    func didEnterBackground() {
        let pendingDeletes = saveQueueStore.applicationWillEnterBackground()
        recommendationQueue.applicationWillEnterBackground()
        Task { await saveQueueStore.flushBackgroundDeletes(pendingDeletes) }
    }
}
