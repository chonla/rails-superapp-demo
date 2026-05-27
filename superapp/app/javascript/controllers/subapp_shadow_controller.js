import { Controller } from "@hotwired/stimulus"
import { Turbo } from "@hotwired/turbo-rails"

export default class extends Controller {
  connect() {
    if (this.element.shadowRoot) return

    const template = this.element.querySelector(":scope > template[shadowrootmode]")
    if (!template) return

    const mode = template.getAttribute("shadowrootmode") === "closed" ? "closed" : "open"
    const root = this.element.attachShadow({ mode })
    root.append(template.content.cloneNode(true))
    template.remove()

    root.addEventListener("click", this.onClick)
  }

  disconnect() {
    if (this.element.shadowRoot) {
      this.element.shadowRoot.removeEventListener("click", this.onClick)
    }
  }

  onClick = (event) => {
    if (event.defaultPrevented) return
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    const link = event.composedPath().find((node) => node.tagName === "A")
    if (!link || !link.href) return

    const frame = link.getAttribute("data-turbo-frame")
    if (!frame) return

    event.preventDefault()
    Turbo.visit(link.href, { frame })
  }
}
