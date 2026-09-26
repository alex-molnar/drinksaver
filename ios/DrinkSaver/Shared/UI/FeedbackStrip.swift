import SwiftUI

struct FeedbackStrip: View {
    @Environment(ThemeStore.self) private var themeStore
    @Environment(SaveQueueStore.self) private var saveQueueStore: SaveQueueStore?
    @Environment(RecommendationsStore.self) private var recommendationsStore: RecommendationsStore?
    @Environment(FeedbackArbiter.self) private var arbiter
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @AccessibilityFocusState private var focusedPart: FocusedPart?
    let placement: FeedbackPlacement

    private enum FocusedPart: Hashable { case message, action }

    var body: some View {
        Group {
            if let item = arbiter.current, !item.message.isEmpty {
                HStack(spacing: 12) {
                    Text(item.message)
                        .font(themeStore.theme.type.body.font)
                        .foregroundStyle(themeStore.theme.ink.primary.color)
                        .accessibilityIdentifier(messageIdentifier)
                        .accessibilityFocused($focusedPart, equals: .message)
                    Spacer(minLength: 4)
                    switch item.state {
                    case .undoable:
                        Button(action: performCurrentAction) {
                            Text("Undo").frame(minHeight: 44).contentShape(Rectangle())
                        }
                            .accessibilityIdentifier(actionIdentifier("undo"))
                            .accessibilityFocused($focusedPart, equals: .action)
                    case .retryable:
                        Button(action: performCurrentAction) {
                            Text("Retry").frame(minHeight: 44).contentShape(Rectangle())
                        }
                            .accessibilityIdentifier(actionIdentifier("retry"))
                            .accessibilityFocused($focusedPart, equals: .action)
                    case .undoing:
                        ProgressView().accessibilityLabel("Undoing")
                    case .progress:
                        ProgressView().accessibilityLabel("In progress")
                            .accessibilityIdentifier(actionIdentifier("progress"))
                    }
                }
                .accessibilityElement(children: .contain)
                .buttonStyle(.bordered)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(themeStore.theme.surface.panel.color)
                .overlay(alignment: .bottom) {
                    Rectangle().fill(themeStore.theme.line.hairline.color).frame(height: 1)
                }
                .transition(.move(edge: .top).combined(with: .opacity))
                .onChange(of: item.state) { _, state in
                    if state == .retryable { focusedPart = .action }
                }
                .onAppear {
                    if item.state == .retryable { focusedPart = .action }
                }
                .onChange(of: focusedPart) { _, value in
                    arbiter.setInteractionActive(value != nil)
                }
            }
        }
        .animation(reduceMotion ? nil : .easeOut(duration: 0.15), value: arbiter.current?.id)
        .allowsHitTesting(arbiter.current.map { !$0.message.isEmpty } ?? false)
    }

    private var messageIdentifier: String {
        switch placement {
        case .addSheet: "frame.add.feedback.message"
        case .quick: "quick.queue.message"
        case .page: "frame.queue.message"
        }
    }

    private func actionIdentifier(_ action: String) -> String {
        switch placement {
        case .addSheet: "frame.add.feedback.\(action)"
        case .quick: "quick.queue.\(action)"
        case .page: "frame.queue.\(action)"
        }
    }

    private func performCurrentAction() {
        arbiter.performCurrentAction(drinks: saveQueueStore, recommendations: recommendationsStore)
        focusedPart = nil
    }
}
