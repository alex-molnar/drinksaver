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
                        .foregroundStyle(isFailure(item) ? themeStore.theme.ink.onAccent.color : themeStore.theme.ink.primary.color)
                        .accessibilityIdentifier(messageIdentifier)
                        .accessibilityFocused($focusedPart, equals: .message)
                    Spacer(minLength: 4)
                    switch item.state {
                    case .undoable:
                        Button(action: performCurrentAction) {
                            Text("Undo").frame(minWidth: 44, minHeight: 44).contentShape(Rectangle())
                        }
                            .accessibilityIdentifier(actionIdentifier("undo"))
                            .accessibilityFocused($focusedPart, equals: .action)
                    case .retryable:
                        Button(action: performCurrentAction) {
                            Text("Retry").frame(minWidth: 44, minHeight: 44).contentShape(Rectangle())
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
                .buttonStyle(.plain)
                .font(themeStore.theme.type.body.font.weight(.semibold))
                .foregroundStyle(isFailure(item) ? themeStore.theme.ink.onAccent.color : themeStore.theme.ink.primary.color)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    isFailure(item) ? themeStore.theme.accent.danger.color : themeStore.theme.surface.panel.color,
                    in: RoundedRectangle(cornerRadius: 12, style: .continuous)
                )
                .overlay { if !isFailure(item) { RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(themeStore.theme.line.hairline.color, lineWidth: 1) } }
                .shadow(color: .black.opacity(0.22), radius: 12, y: 4)
                .padding(.horizontal, 16)
                .padding(.bottom, 12)
                .transition(reduceMotion ? .identity : .move(edge: .bottom).combined(with: .opacity))
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

    private func isFailure(_ item: FeedbackItem) -> Bool { item.state == .retryable }

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
