import { For, Show, createEffect, createMemo, createSignal } from "solid-js"
import {
  Command,
  MenuItem,
  Panel,
  Plugin,
  Slot,
  Style,
  usePlugin,
  type MountedSession,
  type PanelTab,
  type SessionScreen,
} from "@opencode/plugin/gui"
import { locationKey } from "@opencode/client/solid"
import type { ModelInfo } from "@opencode/client/promise"

const styles = `
.mp-panel { display:flex; flex-direction:column; gap:8px; height:100%; min-height:0; padding:10px; font-size:12px; color:inherit; }
.mp-toolbar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.mp-note { opacity:.55; font-size:11px; }
.mp-search { flex:1 1 120px; min-width:100px; background:transparent; color:inherit; border:1px solid color-mix(in srgb, currentColor 20%, transparent); border-radius:6px; padding:3px 7px; font:inherit; outline:none; }
.mp-search:focus { border-color:color-mix(in srgb, currentColor 45%, transparent); }
.mp-sort { appearance:none; background:transparent; color:inherit; border:0; padding:0 2px; font:inherit; font-size:11px; opacity:.5; cursor:pointer; }
.mp-sort:hover { opacity:.85; }
.mp-sort.mp-sort-active { opacity:1; text-decoration:underline; text-underline-offset:3px; }
.mp-dir { min-inline-size:24px; }
.mp-list { display:flex; flex-direction:column; gap:2px; overflow:auto; min-height:0; flex:1; }
.mp-row { appearance:none; text-align:left; background:transparent; border:0; border-radius:6px; padding:6px 8px; cursor:pointer; color:inherit; font:inherit; display:flex; flex-direction:column; gap:2px; }
.mp-row:hover { background:color-mix(in srgb, currentColor 7%, transparent); }
.mp-row.mp-current { background:color-mix(in srgb, currentColor 11%, transparent); }
.mp-row-top { display:flex; align-items:baseline; gap:8px; }
.mp-name { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1 1 auto; font-weight:500; }
.mp-ctx { flex:none; opacity:.55; font-variant-numeric:tabular-nums; }
.mp-row-sub { display:flex; gap:10px; flex-wrap:wrap; opacity:.62; font-variant-numeric:tabular-nums; font-size:11px; }
.mp-tag { border:1px solid color-mix(in srgb, currentColor 22%, transparent); border-radius:999px; padding:0 6px; font-size:10px; line-height:15px; opacity:.8; }
.mp-tag-current { border-color:color-mix(in srgb, currentColor 45%, transparent); opacity:1; }
.mp-empty { opacity:.6; padding:12px 4px; }
.mp-badge { display:inline-flex; align-items:center; gap:3px; font-size:13px; font-weight:530; line-height:20px; letter-spacing:-.04px; opacity:.65; font-variant-numeric:tabular-nums; white-space:nowrap; }
.mp-badge:hover { opacity:.95; }
`

const synced = new Set<string>()

function primaryCost(model: ModelInfo) {
  return model.cost.find((cost) => !cost.tier) ?? model.cost[0]
}

function isFree(model: ModelInfo) {
  return model.cost.length > 0 && model.cost.every((cost) => cost.input === 0)
}

function money(value: number | undefined) {
  if (value === undefined) return "?"
  if (value === 0) return "$0"
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value)
}

function contextWindow(value: number) {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 0 }).format(value)
}

function useModels(session: () => MountedSession) {
  createEffect(() => {
    const current = session()
    const location = current.location
    if (!location) return
    const key = locationKey(location)
    if (synced.has(key)) return
    synced.add(key)
    void current.server.data.location.model.sync(location).catch(() => synced.delete(key))
  })

  return createMemo<ModelInfo[] | undefined>(() => {
    const current = session()
    const location = current.location
    if (!location) return undefined
    return current.server.data.location.model.list(location)
  })
}

function PricePanel(props: { session: MountedSession; screen: SessionScreen }) {
  const ctx = usePlugin()
  const models = useModels(() => props.session)
  const [query, setQuery] = createSignal("")
  const [sort, setSort] = createSignal<"input" | "output" | "name">("input")
  const [showFree, setShowFree] = createSignal(false)
  const [direction, setDirection] = createSignal<"asc" | "desc">("asc")
  const sortKey = () => (sort() === "output" ? "output" : "input")

  const available = createMemo(() => {
    const list = models()
    if (!list) return undefined
    return list.filter((model) => model.enabled !== false && model.status !== "deprecated")
  })

  const hiddenFree = createMemo(() => (available() ?? []).filter(isFree).length)

  const rows = createMemo(() => {
    const list = available()
    if (!list) return undefined
    const needle = query().trim().toLowerCase()
    return list
      .filter((model) => showFree() || !isFree(model))
      .filter((model) => {
        if (!needle) return true
        return `${model.name} ${model.providerID} ${model.modelID}`.toLowerCase().includes(needle)
      })
      .slice()
      .sort((left, right) => {
        const compare =
          sort() === "name"
            ? left.name.localeCompare(right.name)
            : (primaryCost(left)?.[sortKey()] ?? Number.POSITIVE_INFINITY) -
                (primaryCost(right)?.[sortKey()] ?? Number.POSITIVE_INFINITY) ||
              left.name.localeCompare(right.name)
        return direction() === "asc" ? compare : -compare
      })
  })

  const current = createMemo(() => {
    const ref = props.screen.composer.model()
    if (!ref) return undefined
    return (models() ?? []).find((model) => model.providerID === ref.providerID && model.modelID === ref.modelID)
  })

  const tierTitle = (model: ModelInfo) =>
    model.cost
      .map((cost) => {
        const tier = cost.tier ? `> ${cost.tier.size.toLocaleString()} tokens` : "base"
        return `${tier}: in ${money(cost.input)}, out ${money(cost.output)}, cache ${money(cost.cache.read)} / ${money(cost.cache.write)}`
      })
      .join("\n")

  const choose = (model: ModelInfo) => {
    const ok = props.screen.composer.setModel({ providerID: model.providerID, modelID: model.modelID })
    if (!ok) ctx.toast.show({ variant: "error", title: ctx.t("panel.unavailable") })
  }

  return (
    <div class="mp-panel">
      <div class="mp-toolbar">
        <input
          class="mp-search"
          value={query()}
          placeholder={ctx.t("panel.search")}
          onInput={(event) => setQuery(event.currentTarget.value)}
        />
        <span class="mp-note">{ctx.t("panel.note")}</span>
      </div>
      <div class="mp-toolbar">
        <span class="mp-note">{ctx.t("panel.sort")}</span>
        <button class="mp-sort" classList={{ "mp-sort-active": sort() === "input" }} onClick={() => setSort("input")}>
          {ctx.t("panel.input")}
        </button>
        <button class="mp-sort" classList={{ "mp-sort-active": sort() === "output" }} onClick={() => setSort("output")}>
          {ctx.t("panel.output")}
        </button>
        <button class="mp-sort" classList={{ "mp-sort-active": sort() === "name" }} onClick={() => setSort("name")}>
          {ctx.t("panel.name")}
        </button>
        <ctx.ui.Tooltip value={direction() === "asc" ? ctx.t("panel.ascending") : ctx.t("panel.descending")}>
          <ctx.ui.Button
            class="mp-dir"
            size="small"
            variant="ghost-muted"
            onClick={() => setDirection((value) => (value === "asc" ? "desc" : "asc"))}
          >
            {direction() === "asc" ? "↑" : "↓"}
          </ctx.ui.Button>
        </ctx.ui.Tooltip>
        <ctx.ui.Tooltip value={ctx.t("panel.freeHint")}>
          <ctx.ui.Button
            class="mp-free"
            size="small"
            variant="neutral"
            icon={showFree() ? "check" : undefined}
            onClick={() => setShowFree((value) => !value)}
          >
            {ctx.t("panel.free")}
          </ctx.ui.Button>
        </ctx.ui.Tooltip>
        <Show when={!showFree() && hiddenFree() > 0}>
          <span class="mp-note">{ctx.t("panel.freeHidden", { count: hiddenFree() })}</span>
        </Show>
      </div>
      <Show
        when={rows()}
        fallback={<div class="mp-empty">{props.session.location ? ctx.t("panel.loading") : ctx.t("panel.waiting")}</div>}
      >
        {(list) => (
          <Show when={list().length > 0} fallback={<div class="mp-empty">{ctx.t("panel.empty")}</div>}>
            <div class="mp-list">
              <For each={list()}>
                {(model) => {
                  const price = primaryCost(model)
                  const active = () => {
                    const ref = props.screen.composer.model()
                    return !!ref && ref.providerID === model.providerID && ref.modelID === model.modelID
                  }
                  return (
                    <button
                      class="mp-row"
                      classList={{ "mp-current": active() }}
                      title={tierTitle(model)}
                      onClick={() => choose(model)}
                    >
                      <div class="mp-row-top">
                        <span class="mp-name">{model.name}</span>
                        <span class="mp-ctx">{contextWindow(model.limit.context)}</span>
                      </div>
                      <div class="mp-row-sub">
                        <span>
                          {ctx.t("panel.input")} {money(price?.input)}
                        </span>
                        <span>
                          {ctx.t("panel.output")} {money(price?.output)}
                        </span>
                        <span>
                          {ctx.t("panel.cache")} {money(price?.cache.read)} / {money(price?.cache.write)}
                        </span>
                        <Show when={model.cost.length > 1}>
                          <span class="mp-tag">{ctx.t("panel.tiered")}</span>
                        </Show>
                        <Show when={active()}>
                          <span class="mp-tag mp-tag-current">{ctx.t("panel.current")}</span>
                        </Show>
                      </div>
                    </button>
                  )
                }}
              </For>
            </div>
          </Show>
        )}
      </Show>
    </div>
  )
}

function PriceBadge(props: { session: MountedSession; screen: SessionScreen; compact: boolean }) {
  const ctx = usePlugin()
  const models = useModels(() => props.session)
  const current = createMemo(() => {
    const ref = props.screen.composer.model()
    if (!ref) return undefined
    return (models() ?? []).find((model) => model.providerID === ref.providerID && model.modelID === ref.modelID)
  })

  return (
    <Show when={current()}>
      {(model) => {
        const price = primaryCost(model())
        return (
          <span
            class="mp-badge"
            title={`${model().name} · ${ctx.t("panel.input")} ${money(price?.input)} · ${ctx.t("panel.output")} ${money(price?.output)} ${ctx.t("panel.perMillion")}`}
          >
            <Show
              when={!props.compact}
              fallback={
                <>
                  {money(price?.input)} / {money(price?.output)}
                </>
              }
            >
              {ctx.t("panel.input")} {money(price?.input)} · {ctx.t("panel.output")} {money(price?.output)}
            </Show>
          </span>
        )
      }}
    </Show>
  )
}

export default Plugin.define({
  i18n: {
    en: {
      "panel.title": "Model prices",
      "panel.search": "Search models",
      "panel.note": "USD per 1M tokens",
      "panel.sort": "Sort",
      "panel.ascending": "Ascending",
      "panel.descending": "Descending",
      "panel.input": "input",
      "panel.output": "output",
      "panel.name": "name",
      "panel.cache": "cache",
      "panel.free": "free",
      "panel.freeHint": "Show free models (input price 0)",
      "panel.freeHidden": "{{count}} free hidden",
      "panel.tiered": "tiered",
      "panel.current": "current",
      "panel.empty": "No models match",
      "panel.loading": "Loading models…",
      "panel.waiting": "Waiting for the session location…",
      "panel.unavailable": "This model is not available right now",
      "panel.perMillion": "per 1M tokens",
      "command.open": "Model prices",
      "command.description": "Compare input, output and cache prices for every model",
      "command.group": "Model",
    },
  },
  setup(ctx) {
    const tab: PanelTab = {
      id: "prices",
      get title() {
        return ctx.t("panel.title")
      },
      closable: "compact",
      fallback: true,
    }

    ctx.add(Style, styles)

    ctx.add(Panel, {
      id: "prices",
      region: "side",
      width: 460,
      mobile: {
        get title() {
          return ctx.t("panel.title")
        },
        order: 45,
        kind: "menu",
        icon: "models",
      },
      list: (input) => (input.open.includes("prices") ? [tab] : []),
      render: (props) => <PricePanel session={props.session} screen={props.screen} />,
    })

    ctx.add(Command, () => ({
      id: "open",
      title: ctx.t("command.open"),
      description: ctx.t("command.description"),
      group: ctx.t("command.group"),
      section: "model",
      slash: { name: "prices" },
      run: () => {
        const session = ctx.sessions.current()
        if (!session) return false
        ctx.layout.open(`${ctx.id}:prices`, session, { tab: "select" })
      },
    }))

    ctx.add(MenuItem, () => ({
      menu: "session.panel",
      id: "prices",
      title: ctx.t("panel.title"),
      icon: "models",
      order: 40,
      run: () => {
        const session = ctx.sessions.current()
        if (session) ctx.layout.open(`${ctx.id}:prices`, session)
      },
    }))

    ctx.add(Slot, {
      at: "session.header",
      order: 20,
      render: (input) => <PriceBadge session={input.session} screen={input.screen} compact={input.compact} />,
    })
  },
})
