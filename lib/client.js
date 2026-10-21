window.__ModuleLoader__.load({
	id: "dsh-project-cockpit",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_dom_client = require("react-dom/client");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/theme.ts
		const lightTokens = {
			primary: "#4f46e5",
			primarySoft: "#eef2ff",
			text: "#1f2937",
			muted: "#6b7280",
			border: "#e5e7eb",
			bg: "#ffffff",
			cardBg: "#f9fafb",
			good: "#16a34a",
			goodSoft: "#f0fdf4",
			warn: "#d97706",
			warnSoft: "#fffbeb",
			bad: "#dc2626",
			badSoft: "#fef2f2",
			info: "#2563eb",
			infoSoft: "#eff6ff",
			purple: "#7c3aed",
			purpleSoft: "#f5f3ff",
			orange: "#ea580c",
			orangeSoft: "#fff7ed"
		};
		const darkTokens = {
			primary: "#818cf8",
			primarySoft: "#1e1b4b",
			text: "#f3f4f6",
			muted: "#9ca3af",
			border: "#374151",
			bg: "#111827",
			cardBg: "#1f2937",
			good: "#4ade80",
			goodSoft: "#052e16",
			warn: "#fbbf24",
			warnSoft: "#451a03",
			bad: "#f87171",
			badSoft: "#450a0a",
			info: "#60a5fa",
			infoSoft: "#172554",
			purple: "#a78bfa",
			purpleSoft: "#2e1065",
			orange: "#fb923c",
			orangeSoft: "#431407"
		};
		function resolveTokens(mode, prefersDark) {
			if (mode === "dark") return darkTokens;
			if (mode === "light") return lightTokens;
			return prefersDark ? darkTokens : lightTokens;
		}
		function detectPrefersDark() {
			if (typeof window === "undefined" || !window.matchMedia) return false;
			return window.matchMedia("(prefers-color-scheme: dark)").matches;
		}
		//#endregion
		//#region src/client/theme-context.tsx
		const ThemeContext = (0, react.createContext)(lightTokensFallback());
		function lightTokensFallback() {
			return resolveTokens("light", false);
		}
		const ThemeProvider = ({ mode, children }) => {
			const [prefersDark, setPrefersDark] = (0, react.useState)(detectPrefersDark);
			(0, react.useEffect)(() => {
				if (typeof window === "undefined" || !window.matchMedia) return;
				const mql = window.matchMedia("(prefers-color-scheme: dark)");
				const handler = (e) => setPrefersDark(e.matches);
				mql.addEventListener("change", handler);
				return () => mql.removeEventListener("change", handler);
			}, []);
			const tokens = resolveTokens(mode, prefersDark);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThemeContext.Provider, {
				value: tokens,
				children
			});
		};
		function useTheme() {
			return (0, react.useContext)(ThemeContext);
		}
		//#endregion
		//#region src/client/hooks/usePanelGeometry.ts
		const STORAGE_KEY = "dsh-project-cockpit:geometry";
		const MIN_WIDTH = 320;
		const MIN_HEIGHT = 240;
		function loadGeometry() {
			try {
				if (typeof localStorage === "undefined") return null;
				const raw = localStorage.getItem(STORAGE_KEY);
				if (!raw) return null;
				const g = JSON.parse(raw);
				if (typeof g.x === "number" && typeof g.y === "number" && typeof g.width === "number" && typeof g.height === "number") return g;
			} catch {}
			return null;
		}
		function saveGeometry(g) {
			try {
				if (typeof localStorage === "undefined") return;
				localStorage.setItem(STORAGE_KEY, JSON.stringify(g));
			} catch {}
		}
		function usePanelGeometry(initial) {
			const [geometry, setGeometry] = (0, react.useState)(() => loadGeometry() ?? initial);
			const dragRef = (0, react.useRef)({
				mode: null,
				startX: 0,
				startY: 0,
				orig: geometry
			});
			(0, react.useEffect)(() => {
				saveGeometry(geometry);
			}, [geometry]);
			return {
				geometry,
				onHeaderPointerDown: (0, react.useCallback)((e) => {
					dragRef.current = {
						mode: "move",
						startX: e.clientX,
						startY: e.clientY,
						orig: geometry
					};
					e.currentTarget.setPointerCapture(e.pointerId);
					e.preventDefault();
				}, [geometry]),
				onResizePointerDown: (0, react.useCallback)((e) => {
					e.stopPropagation();
					dragRef.current = {
						mode: "resize",
						startX: e.clientX,
						startY: e.clientY,
						orig: geometry
					};
					e.currentTarget.setPointerCapture(e.pointerId);
					e.preventDefault();
				}, [geometry]),
				onPointerMove: (0, react.useCallback)((e) => {
					const d = dragRef.current;
					if (!d.mode) return;
					const dx = e.clientX - d.startX;
					const dy = e.clientY - d.startY;
					if (d.mode === "move") setGeometry({
						...d.orig,
						x: d.orig.x + dx,
						y: d.orig.y + dy
					});
					else setGeometry({
						...d.orig,
						width: Math.max(MIN_WIDTH, d.orig.width + dx),
						height: Math.max(MIN_HEIGHT, d.orig.height + dy)
					});
				}, []),
				onPointerUp: (0, react.useCallback)((e) => {
					if (dragRef.current.mode) try {
						e.currentTarget.releasePointerCapture(e.pointerId);
					} catch {}
					dragRef.current.mode = null;
				}, [])
			};
		}
		//#endregion
		//#region src/client/components/FloatingPanel.tsx
		const FloatingPanel = ({ title, onClose, children }) => {
			const t = useTheme();
			const { geometry, onHeaderPointerDown, onResizePointerDown, onPointerMove, onPointerUp } = usePanelGeometry({
				x: typeof window !== "undefined" ? Math.max(24, window.innerWidth - 424) : 24,
				y: typeof window !== "undefined" ? Math.max(24, window.innerHeight - 620) : 24,
				width: 400,
				height: 600
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				onPointerMove,
				onPointerUp,
				style: {
					position: "fixed",
					left: geometry.x,
					top: geometry.y,
					width: geometry.width,
					height: geometry.height,
					background: t.bg,
					border: `1px solid ${t.border}`,
					borderRadius: 14,
					boxShadow: "0 12px 40px rgba(0,0,0,0.24)",
					zIndex: 999999,
					display: "flex",
					flexDirection: "column",
					fontFamily: "system-ui, -apple-system, sans-serif, \"PingFang SC\", \"Microsoft YaHei\"",
					overflow: "hidden",
					color: t.text,
					fontSize: 13
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						onPointerDown: onHeaderPointerDown,
						style: {
							padding: "10px 12px",
							borderBottom: `1px solid ${t.border}`,
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							cursor: "grab",
							userSelect: "none",
							fontWeight: 700,
							fontSize: 13
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: title }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							onClick: onClose,
							onPointerDown: (e) => e.stopPropagation(),
							style: {
								fontSize: 12,
								color: t.muted,
								cursor: "pointer",
								padding: "0 4px"
							},
							children: "✕"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							flex: 1,
							overflowY: "auto",
							padding: 12
						},
						children
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						onPointerDown: onResizePointerDown,
						style: {
							position: "absolute",
							right: 0,
							bottom: 0,
							width: 14,
							height: 14,
							cursor: "nwse-resize",
							background: `linear-gradient(135deg, transparent 50%, ${t.border} 50%)`
						}
					})
				]
			});
		};
		//#endregion
		//#region src/client/store.ts
		/**
		* Cockpit 单一状态源 —— 跨 tab 共享。
		*
		* 设计要点：
		*   - 基于 useSyncExternalStore 的极简快照 store，零外部依赖；
		*   - 更新用 rAF 批发布，避免一次表单输入触发多次重渲染；
		*   - updateSlice 只替换目标 slice，未变的 slice 保持引用，
		*     useCockpit(store, s => s.opportunity) 的组件不会因为别的 slice 变化而重渲染。
		*/
		const DEFAULT_STATE = {
			opportunity: {
				name: "示例机会",
				type: "bounty",
				deadline: "",
				source_url: "",
				requirements: [{
					category: "ability",
					text: "需要 MCP 适配能力"
				}]
			},
			capabilities: [{
				name: "MCP 适配器",
				description: "能把工具包装为 MCP 服务",
				real: true
			}],
			projects: [{
				id: "p1",
				name: "ai-workflow",
				path: "",
				stack: ["node"],
				tags: [],
				summary: ""
			}, {
				id: "p2",
				name: "hermes-mcp",
				path: "",
				stack: ["rust"],
				tags: [],
				summary: ""
			}],
			relations: [{
				id: "r1",
				source: "p1",
				target: "p2",
				type: "combine",
				confidence: .8,
				reason: "共享能力"
			}],
			rootPath: "",
			costParams: {
				modelKey: "2",
				scene: "codegen",
				careerKey: "2",
				hardwareCost: "2000",
				roi: "1",
				lifespanYears: "3"
			},
			signalInput: {
				sourceVerifiability: "medium",
				paymentSignalPresent: true,
				anomaly: false,
				series: "10,12,60,120"
			}
		};
		var CockpitStore = class {
			state = DEFAULT_STATE;
			listeners = /* @__PURE__ */ new Set();
			rafPending = false;
			getState = () => this.state;
			subscribe = (fn) => {
				this.listeners.add(fn);
				return () => {
					this.listeners.delete(fn);
				};
			};
			setState = (updater) => {
				const next = updater(this.state);
				if (next === this.state) return;
				this.state = next;
				this.scheduleFlush();
			};
			updateSlice = (key, patch) => {
				this.setState((s) => {
					const current = s[key];
					if (current && typeof current === "object" && !Array.isArray(current)) return {
						...s,
						[key]: {
							...current,
							...patch
						}
					};
					return s;
				});
			};
			scheduleFlush() {
				if (typeof window === "undefined" || typeof requestAnimationFrame !== "function") {
					this.flush();
					return;
				}
				if (this.rafPending) return;
				this.rafPending = true;
				requestAnimationFrame(() => {
					this.rafPending = false;
					this.flush();
				});
			}
			flush() {
				for (const fn of this.listeners) try {
					fn();
				} catch (e) {
					console.warn("[cockpit-store] listener failed", e);
				}
			}
		};
		function createCockpitStore(initial) {
			const store = new CockpitStore();
			if (initial) store.setState((s) => ({
				...s,
				...initial
			}));
			return store;
		}
		/**
		* selector 必须返回稳定引用或 primitive。
		* slice 未变时（浅展开保留引用）不会触发重渲染。
		*/
		function useCockpit(store, selector) {
			return (0, react.useSyncExternalStore)(store.subscribe, () => selector(store.getState()), () => selector(store.getState()));
		}
		//#endregion
		//#region src/client/constants.ts
		const MATCH_TYPES = [
			{
				value: "bounty",
				label: "赏金 Bounty"
			},
			{
				value: "competition",
				label: "竞赛 Competition"
			},
			{
				value: "grant",
				label: "资助 Grant"
			},
			{
				value: "rfp",
				label: "招标 RFP"
			}
		];
		//#endregion
		//#region src/client/rpc.ts
		/**
		* RPC 封装 —— 统一超时、授权头、错误语义。
		* 返回值是 discriminated union，调用方无需再判 data.error。
		*/
		const ROUTE = "/__dsh/project-cockpit";
		const AUTH_HEADER = "project-cockpit";
		const REGISTRY_ID = "project-cockpit";
		const SETTINGS_NS = "code-constellation";
		async function callRpc(method, payload) {
			try {
				const res = await fetch(`${ROUTE}/${method}`, {
					method: "POST",
					headers: {
						"X-DSH-Request": AUTH_HEADER,
						"Content-Type": "application/json"
					},
					body: JSON.stringify(payload ?? {}),
					signal: AbortSignal.timeout(3e4)
				});
				if (!res.ok) return {
					ok: false,
					error: `HTTP ${res.status}`
				};
				const data = await res.json();
				if (data && typeof data === "object" && data.ok === false) return {
					ok: false,
					error: String(data.error ?? "rpc error")
				};
				return {
					ok: true,
					data
				};
			} catch (cause) {
				return {
					ok: false,
					error: cause instanceof Error ? cause.message : String(cause)
				};
			}
		}
		//#endregion
		//#region src/client/hooks/useRpc.ts
		function useRpc(fn) {
			const [state, setState] = (0, react.useState)({
				loading: false,
				data: null,
				error: null
			});
			const fnRef = (0, react.useRef)(fn);
			fnRef.current = fn;
			const run = (0, react.useCallback)(async () => {
				setState((s) => ({
					...s,
					loading: true,
					error: null
				}));
				const result = await fnRef.current();
				if (result.ok) setState({
					loading: false,
					data: result.data,
					error: null
				});
				else setState({
					loading: false,
					data: null,
					error: result.error
				});
				return result;
			}, []);
			const reset = (0, react.useCallback)(() => {
				setState({
					loading: false,
					data: null,
					error: null
				});
			}, []);
			return {
				...state,
				run,
				reset
			};
		}
		//#endregion
		//#region src/client/components/Badge.tsx
		const Badge = ({ tone, children }) => {
			const t = useTheme();
			const s = {
				good: {
					bg: t.goodSoft,
					fg: t.good
				},
				warn: {
					bg: t.warnSoft,
					fg: t.warn
				},
				bad: {
					bg: t.badSoft,
					fg: t.bad
				},
				info: {
					bg: t.infoSoft,
					fg: t.info
				},
				purple: {
					bg: t.purpleSoft,
					fg: t.purple
				},
				orange: {
					bg: t.orangeSoft,
					fg: t.orange
				}
			}[tone];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: {
					display: "inline-block",
					padding: "2px 10px",
					borderRadius: 999,
					fontSize: 12,
					fontWeight: 700,
					background: s.bg,
					color: s.fg
				},
				children
			});
		};
		//#endregion
		//#region src/client/components/MetricCard.tsx
		const MetricCard = ({ label, value, sub, color }) => {
			const t = useTheme();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					background: t.cardBg,
					border: `1px solid ${t.border}`,
					borderRadius: 10,
					padding: "10px 12px"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 11,
							fontWeight: 700,
							letterSpacing: .5,
							color: t.muted,
							textTransform: "uppercase",
							marginBottom: 6
						},
						children: label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 18,
							fontWeight: 800,
							color: color ?? t.text
						},
						children: value
					}),
					sub && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 11,
							color: t.muted,
							marginTop: 2
						},
						children: sub
					})
				]
			});
		};
		//#endregion
		//#region src/client/components/OutError.tsx
		const OutError = ({ error }) => {
			const t = useTheme();
			if (!error) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					color: t.bad,
					fontSize: 12,
					marginTop: 4
				},
				children: ["⚠ ", error]
			});
		};
		//#endregion
		//#region src/client/components/GraphCanvas.tsx
		/**
		* GraphCanvas —— Canvas 2D 力导向图谱。
		*
		* 布局：斥力（O(n²)，≤500 节点可接受）+ 弹簧（边）+ 中心引力 + 阻尼。
		* 渲染：Canvas 2D，dpr 自适应，节点圆形 + 文本标签，边按类型着色。
		* 模拟：requestAnimationFrame 驱动，alpha 衰减到 0.02 停止。
		*
		* 相比原 SVG 圆环布局：节点不再固定重叠，规模上去后仍可读。
		*/
		const WIDTH = 460;
		const HEIGHT = 340;
		const NODE_RADIUS = 15;
		function toLabel(n) {
			return String(n.name ?? n.id ?? "?").slice(0, 10);
		}
		function buildSim(data) {
			const rawNodes = data.nodes ?? [];
			const count = Math.max(1, rawNodes.length);
			return {
				nodes: rawNodes.map((n, i) => {
					const angle = 2 * Math.PI * i / count;
					return {
						id: n.id,
						label: toLabel(n),
						x: Math.cos(angle) * 80,
						y: Math.sin(angle) * 80,
						vx: 0,
						vy: 0
					};
				}),
				edges: [...(data.projectRelations ?? []).map((e) => ({
					source: e.source,
					target: e.target,
					type: e.type,
					confidence: e.confidence
				})), ...(data.capabilityEdges ?? []).map((e) => ({
					source: e.source,
					target: e.target,
					type: "provides",
					confidence: .5
				}))]
			};
		}
		function tick(nodes, edges, alpha) {
			for (let i = 0; i < nodes.length; i++) {
				const a = nodes[i];
				for (let j = i + 1; j < nodes.length; j++) {
					const b = nodes[j];
					let dx = b.x - a.x;
					let dy = b.y - a.y;
					let dist2 = dx * dx + dy * dy;
					if (dist2 < 1) {
						dx = (Math.random() - .5) * 2;
						dy = (Math.random() - .5) * 2;
						dist2 = dx * dx + dy * dy;
					}
					const dist = Math.sqrt(dist2);
					const force = 2e3 / dist2;
					const fx = dx / dist * force;
					const fy = dy / dist * force;
					a.vx -= fx * alpha;
					a.vy -= fy * alpha;
					b.vx += fx * alpha;
					b.vy += fy * alpha;
				}
			}
			const byId = new Map(nodes.map((n) => [n.id, n]));
			for (const e of edges) {
				const a = byId.get(e.source);
				const b = byId.get(e.target);
				if (!a || !b) continue;
				const dx = b.x - a.x;
				const dy = b.y - a.y;
				const dist = Math.sqrt(dx * dx + dy * dy) || 1;
				const force = (dist - 90) * .02;
				const fx = dx / dist * force * alpha;
				const fy = dy / dist * force * alpha;
				a.vx += fx;
				a.vy += fy;
				b.vx -= fx;
				b.vy -= fy;
			}
			for (const n of nodes) {
				n.vx += -n.x * .002 * alpha;
				n.vy += -n.y * .002 * alpha;
				n.vx *= .85;
				n.vy *= .85;
				n.x += n.vx;
				n.y += n.vy;
			}
		}
		const GraphCanvas = ({ data, emptyHint = "（空图谱 — 先添加项目并扫描）" }) => {
			const t = useTheme();
			const canvasRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const canvas = canvasRef.current;
				if (!canvas) return;
				const { nodes, edges } = buildSim(data);
				if (nodes.length === 0) return;
				const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
				canvas.width = WIDTH * dpr;
				canvas.height = HEIGHT * dpr;
				canvas.style.width = `${WIDTH}px`;
				canvas.style.height = `${HEIGHT}px`;
				const ctx = canvas.getContext("2d");
				if (!ctx) return;
				ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
				let alpha = 1;
				let raf = null;
				function draw() {
					if (!ctx) return;
					ctx.clearRect(0, 0, WIDTH, HEIGHT);
					ctx.save();
					ctx.translate(WIDTH / 2, HEIGHT / 2);
					const byId = new Map(nodes.map((n) => [n.id, n]));
					for (const e of edges) {
						const a = byId.get(e.source);
						const b = byId.get(e.target);
						if (!a || !b) continue;
						ctx.beginPath();
						ctx.moveTo(a.x, a.y);
						ctx.lineTo(b.x, b.y);
						if (e.type === "combine" || e.type === "shares_stack") {
							ctx.strokeStyle = t.purple;
							ctx.setLineDash([]);
						} else if (e.type === "overlap") {
							ctx.strokeStyle = t.orange;
							ctx.setLineDash([4, 3]);
						} else {
							ctx.strokeStyle = t.border;
							ctx.setLineDash([]);
						}
						ctx.lineWidth = 1 + (e.confidence ?? .5) * 2;
						ctx.stroke();
					}
					ctx.setLineDash([]);
					for (const n of nodes) {
						ctx.beginPath();
						ctx.arc(n.x, n.y, NODE_RADIUS, 0, 2 * Math.PI);
						ctx.fillStyle = t.text;
						ctx.fill();
						ctx.strokeStyle = t.muted;
						ctx.lineWidth = 1;
						ctx.stroke();
						ctx.fillStyle = t.bg;
						ctx.font = "10px system-ui, -apple-system, sans-serif";
						ctx.textAlign = "center";
						ctx.textBaseline = "middle";
						ctx.fillText(n.label, n.x, n.y);
					}
					ctx.restore();
				}
				function loop() {
					if (alpha > .02) {
						tick(nodes, edges, alpha);
						alpha *= .98;
						draw();
						raf = requestAnimationFrame(loop);
					} else {
						draw();
						raf = null;
					}
				}
				loop();
				return () => {
					if (raf != null) cancelAnimationFrame(raf);
					raf = null;
				};
			}, [data, t]);
			if (!data?.nodes || data.nodes.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					color: t.muted,
					fontSize: 12
				},
				children: emptyHint
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("canvas", {
				ref: canvasRef,
				style: {
					display: "block",
					maxWidth: "100%"
				}
			});
		};
		//#endregion
		//#region src/client/tabs/OrchestrateTab.tsx
		const inputStyle$4 = (t) => ({
			width: "100%",
			padding: "6px 8px",
			borderRadius: 6,
			border: `1px solid ${t.border}`,
			fontSize: 12,
			boxSizing: "border-box",
			background: t.bg,
			color: t.text
		});
		const OrchestrateTab = ({ store }) => {
			const t = useTheme();
			const opportunity = useCockpit(store, (s) => s.opportunity);
			const capabilities = useCockpit(store, (s) => s.capabilities);
			const pipeline = useRpc(() => callRpc("pipeline", {
				opportunity,
				project: {
					id: "p-main",
					name: "ai-workflow"
				},
				capabilities
			}));
			const card = pipeline.data?.decisionCard;
			const graph = pipeline.data?.graph;
			const stages = pipeline.data?.stages;
			const verdictTone = {
				proceed: "good",
				iterate: "warn",
				pivot: "orange",
				kill: "bad"
			};
			const reqText = opportunity.requirements[0]?.text ?? "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 10
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							background: t.cardBg,
							border: `1px solid ${t.border}`,
							borderRadius: 10,
							padding: "10px 12px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									fontSize: 11,
									fontWeight: 700,
									letterSpacing: .5,
									color: t.muted,
									textTransform: "uppercase",
									marginBottom: 6
								},
								children: "一次输入 → 四引擎串联（评分 → 信号 → 成本 → 图谱）"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								style: {
									fontSize: 12,
									color: t.muted,
									display: "block",
									marginBottom: 3
								},
								children: "机会名称"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								value: opportunity.name,
								onChange: (e) => store.updateSlice("opportunity", { name: e.currentTarget.value }),
								style: inputStyle$4(t)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: 6,
									marginTop: 6
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: {
										fontSize: 12,
										color: t.muted,
										display: "block",
										marginBottom: 3
									},
									children: "类型"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
									value: opportunity.type,
									onChange: (e) => store.updateSlice("opportunity", { type: e.currentTarget.value }),
									style: inputStyle$4(t),
									children: MATCH_TYPES.map((mt) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: mt.value,
										children: mt.label
									}, mt.value))
								})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: {
										fontSize: 12,
										color: t.muted,
										display: "block",
										marginBottom: 3
									},
									children: "能力需求"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									value: reqText,
									onChange: (e) => store.updateSlice("opportunity", { requirements: [{
										category: "ability",
										text: e.currentTarget.value
									}] }),
									style: inputStyle$4(t)
								})] })]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						onClick: () => pipeline.run(),
						disabled: pipeline.loading,
						style: {
							padding: "9px 0",
							borderRadius: 6,
							border: `1px solid ${t.primary}`,
							color: t.primary,
							background: t.primarySoft,
							fontSize: 13,
							cursor: pipeline.loading ? "not-allowed" : "pointer",
							fontWeight: 700
						},
						children: pipeline.loading ? "流水线执行中…" : "🧭 跑完整评估流水线"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(OutError, { error: pipeline.error }),
					stages && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							background: t.cardBg,
							border: `1px solid ${t.border}`,
							borderRadius: 10,
							padding: "10px 12px"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								fontSize: 11,
								fontWeight: 700,
								color: t.muted,
								letterSpacing: .5,
								textTransform: "uppercase",
								marginBottom: 6
							},
							children: "阶段耗时"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								display: "flex",
								gap: 4,
								flexWrap: "wrap"
							},
							children: stages.map((s) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Badge, {
								tone: s.ok ? "good" : "bad",
								children: [
									s.stage,
									" ",
									s.ok ? `${s.ms}ms` : "失败"
								]
							}, s.stage))
						})]
					}),
					card && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								padding: "4px 2px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: 13,
									fontWeight: 700
								},
								children: "决策卡"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Badge, {
								tone: verdictTone[card.verdict] ?? "info",
								children: card.verdict
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								background: t.primarySoft,
								borderRadius: 8,
								padding: "8px 10px",
								fontSize: 12,
								color: t.primary
							},
							children: card.advice
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: 6
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricCard, {
									label: "匹配分",
									value: `${Math.round(card.matchScore * 100)}%`,
									sub: "来自 GapForm",
									color: t.primary
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricCard, {
									label: "信号可信",
									value: {
										high: "高",
										medium: "中",
										low: "低"
									}[card.confidence] ?? "—",
									sub: `raw ${card.signalRaw == null ? "—" : Math.round(card.signalRaw * 100) + "%"}`,
									color: card.confidence === "high" ? t.good : card.confidence === "medium" ? t.warn : t.bad
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricCard, {
									label: "回本周期",
									value: card.cost?.daysToBreakEven == null || card.cost.daysToBreakEven === Infinity ? "∞" : `${Math.round(card.cost.daysToBreakEven)} 天`,
									sub: card.cost?.model ?? "—"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricCard, {
									label: "每月节省",
									value: card.cost ? `¥${Math.round(card.cost.monthlySaving ?? 0).toLocaleString()}` : "—",
									sub: card.cost?.scene ?? ""
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								background: t.cardBg,
								border: `1px solid ${t.border}`,
								borderRadius: 10,
								padding: "10px 12px"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: 11,
										fontWeight: 700,
										color: t.muted,
										letterSpacing: .5,
										textTransform: "uppercase",
										marginBottom: 6
									},
									children: "推荐武器 & 缺口"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										fontSize: 13,
										fontWeight: 700
									},
									children: ["🛠 ", card.recommendedWeapon || "—"]
								}),
								card.gaps?.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: { marginTop: 4 },
									children: card.gaps.map((g, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											fontSize: 12,
											color: t.warn
										},
										children: ["▸ ", g]
									}, i))
								}),
								card.notes?.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										marginTop: 6,
										fontSize: 11,
										color: t.muted
									},
									children: card.notes.map((n, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: ["· ", n] }, i))
								})
							]
						})
					] }),
					graph && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							alignItems: "center"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(GraphCanvas, { data: graph }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								fontSize: 11,
								color: t.muted,
								marginTop: 2
							},
							children: [
								graph.nodes?.length ?? 0,
								" 节点 · ",
								graph.projectRelations?.length ?? 0,
								" 关系边"
							]
						})]
					})
				]
			});
		};
		//#endregion
		//#region src/client/components/Bar.tsx
		const Bar = ({ value, color, height = 10 }) => {
			const t = useTheme();
			const pct = Math.max(0, Math.min(1, value)) * 100;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					background: t.border,
					borderRadius: 5,
					height,
					overflow: "hidden",
					width: "100%"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
					width: `${pct}%`,
					height: "100%",
					background: color ?? t.primary,
					transition: "width .3s ease"
				} })
			});
		};
		//#endregion
		//#region src/client/components/Row.tsx
		const Row = ({ children, gap = 6, style }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			style: {
				display: "flex",
				gap,
				alignItems: "center",
				...style
			},
			children
		});
		//#endregion
		//#region src/client/tabs/MatchTab.tsx
		const cardStyle$3 = (t) => ({
			background: t.cardBg,
			border: `1px solid ${t.border}`,
			borderRadius: 10,
			padding: "10px 12px"
		});
		const sectionTitleStyle = (t) => ({
			fontSize: 11,
			fontWeight: 700,
			letterSpacing: .5,
			color: t.muted,
			textTransform: "uppercase",
			marginBottom: 6
		});
		const labelStyle$3 = (t) => ({
			fontSize: 12,
			color: t.muted,
			display: "block",
			marginBottom: 3
		});
		const inputStyle$3 = (t) => ({
			width: "100%",
			padding: "6px 8px",
			borderRadius: 6,
			border: `1px solid ${t.border}`,
			fontSize: 12,
			boxSizing: "border-box",
			background: t.bg,
			color: t.text
		});
		const MatchTab = ({ store }) => {
			const t = useTheme();
			const opportunity = useCockpit(store, (s) => s.opportunity);
			const capabilities = useCockpit(store, (s) => s.capabilities);
			const match = useRpc(() => callRpc("match", {
				opportunity,
				project: {
					id: 1,
					name: "ai-workflow"
				},
				capabilities
			}));
			const [reqText, setReqText] = (0, react.useState)("");
			const [capName, setCapName] = (0, react.useState)("");
			const [capDesc, setCapDesc] = (0, react.useState)("");
			function addRequirement() {
				if (!reqText.trim()) return;
				store.updateSlice("opportunity", { requirements: [...opportunity.requirements, {
					category: "ability",
					text: reqText.trim()
				}] });
				setReqText("");
			}
			function addCap() {
				if (!capName.trim()) return;
				store.setState((s) => ({
					...s,
					capabilities: [...s.capabilities, {
						name: capName.trim(),
						description: capDesc.trim(),
						real: true
					}]
				}));
				setCapName("");
				setCapDesc("");
			}
			const result = match.data?.match;
			const verdictTone = result?.verdict === "proceed" ? "good" : result?.verdict === "iterate" ? "warn" : "bad";
			const verdictLabel = {
				proceed: "✅ 推进",
				iterate: "🔁 迭代",
				pivot: "🔄 转向",
				kill: "⛔ 否决"
			}[result?.verdict] ?? result?.verdict;
			const dims = result ? [
				{
					key: "capability",
					label: "能力",
					color: t.primary
				},
				{
					key: "barrier",
					label: "门槛",
					color: t.purple
				},
				{
					key: "time",
					label: "时间",
					color: t.orange
				},
				{
					key: "resource",
					label: "资源",
					color: t.warn
				},
				{
					key: "credibility",
					label: "可信",
					color: t.good
				},
				{
					key: "compound",
					label: "复合",
					color: t.info
				}
			] : [];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 10
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: cardStyle$3(t),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: sectionTitleStyle(t),
								children: "机会"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Row, {
								gap: 6,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: { flex: 2 },
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										style: labelStyle$3(t),
										children: "名称"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										style: inputStyle$3(t),
										value: opportunity.name,
										onChange: (e) => store.updateSlice("opportunity", { name: e.currentTarget.value })
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: { flex: 1 },
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										style: labelStyle$3(t),
										children: "类型"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
										style: inputStyle$3(t),
										value: opportunity.type,
										onChange: (e) => store.updateSlice("opportunity", { type: e.currentTarget.value }),
										children: MATCH_TYPES.map((mt) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: mt.value,
											children: mt.label
										}, mt.value))
									})]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: 6,
									marginTop: 6
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: { flex: 1 },
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										style: labelStyle$3(t),
										children: "截止日期"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										style: inputStyle$3(t),
										type: "date",
										value: opportunity.deadline,
										onChange: (e) => store.updateSlice("opportunity", { deadline: e.currentTarget.value })
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: { flex: 2 },
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										style: labelStyle$3(t),
										children: "来源链接"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										style: inputStyle$3(t),
										value: opportunity.source_url,
										onChange: (e) => store.updateSlice("opportunity", { source_url: e.currentTarget.value })
									})]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: { marginTop: 6 },
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										style: labelStyle$3(t),
										children: "能力需求（requirements）"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Row, {
										gap: 6,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											style: inputStyle$3(t),
											placeholder: "如：需要 MCP 适配能力",
											value: reqText,
											onChange: (e) => setReqText(e.currentTarget.value),
											onKeyDown: (e) => {
												if (e.key === "Enter") addRequirement();
											}
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											onClick: addRequirement,
											style: {
												padding: "6px 12px",
												borderRadius: 6,
												border: `1px solid ${t.border}`,
												color: t.text,
												background: t.bg,
												cursor: "pointer",
												fontSize: 12
											},
											children: "＋ 添加"
										})]
									}),
									opportunity.requirements.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											display: "flex",
											flexWrap: "wrap",
											gap: 4,
											marginTop: 6
										},
										children: opportunity.requirements.map((r, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: {
												display: "inline-flex",
												alignItems: "center",
												gap: 4,
												background: t.infoSoft,
												color: t.info,
												borderRadius: 999,
												padding: "2px 10px",
												fontSize: 12
											},
											children: [r.text, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: { cursor: "pointer" },
												onClick: () => store.updateSlice("opportunity", { requirements: opportunity.requirements.filter((_, j) => j !== i) }),
												children: "✕"
											})]
										}, i))
									})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: cardStyle$3(t),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: sectionTitleStyle(t),
								children: "项目能力（capabilities，real 勾选）"
							}),
							capabilities.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									display: "flex",
									flexDirection: "column",
									gap: 4,
									marginBottom: 6
								},
								children: capabilities.map((c, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Row, {
									gap: 8,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												width: 110,
												fontSize: 12,
												fontWeight: 600,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap"
											},
											children: c.name
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												flex: 1,
												fontSize: 11,
												color: t.muted,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap"
											},
											children: c.description
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: !!c.real,
											onChange: (e) => {
												const checked = e.currentTarget.checked;
												store.setState((s) => ({
													...s,
													capabilities: s.capabilities.map((x, j) => j === i ? {
														...x,
														real: checked
													} : x)
												}));
											}
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												cursor: "pointer",
												fontSize: 12,
												color: t.muted
											},
											onClick: () => store.setState((s) => ({
												...s,
												capabilities: s.capabilities.filter((_, j) => j !== i)
											})),
											children: "✕"
										})
									]
								}, i))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Row, {
								gap: 6,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										style: {
											...inputStyle$3(t),
											flex: 1
										},
										placeholder: "能力名，如：MCP 适配器",
										value: capName,
										onChange: (e) => setCapName(e.currentTarget.value)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										style: {
											...inputStyle$3(t),
											flex: 2
										},
										placeholder: "一句话说明",
										value: capDesc,
										onChange: (e) => setCapDesc(e.currentTarget.value)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										onClick: addCap,
										style: {
											padding: "6px 12px",
											borderRadius: 6,
											border: `1px solid ${t.border}`,
											color: t.text,
											background: t.bg,
											cursor: "pointer",
											fontSize: 12
										},
										children: "＋"
									})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						onClick: () => match.run(),
						disabled: match.loading,
						style: {
							padding: "9px 0",
							borderRadius: 6,
							border: `1px solid ${t.primary}`,
							color: t.primary,
							background: t.primarySoft,
							fontSize: 13,
							cursor: match.loading ? "not-allowed" : "pointer",
							fontWeight: 700
						},
						children: match.loading ? "评分中…" : "🎯 六维匹配评分"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(OutError, { error: match.error }),
					result && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								padding: "4px 2px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: {
									fontSize: 13,
									fontWeight: 700
								},
								children: [
									"综合匹配 ",
									Math.round((result.matchScore ?? 0) * 100),
									"%"
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Badge, {
								tone: verdictTone,
								children: verdictLabel
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: 6
							},
							children: dims.map((d) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: cardStyle$3(t),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											fontSize: 11,
											color: t.muted,
											marginBottom: 4
										},
										children: d.label
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Bar, {
										value: result[d.key] ?? 0,
										color: d.color
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											fontSize: 11,
											fontWeight: 700,
											marginTop: 3,
											color: d.color
										},
										children: [Math.round((result[d.key] ?? 0) * 100), "%"]
									})
								]
							}, d.key))
						}),
						result.recommendedWeapon && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: cardStyle$3(t),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: sectionTitleStyle(t),
								children: "推荐武器"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									fontSize: 13,
									fontWeight: 700
								},
								children: ["🛠 ", result.recommendedWeapon]
							})]
						}),
						result.firstStep && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								background: t.primarySoft,
								borderRadius: 8,
								padding: "8px 10px",
								fontSize: 12,
								color: t.primary
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: "第一步：" }), result.firstStep]
						}),
						result.gaps?.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: cardStyle$3(t),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: sectionTitleStyle(t),
								children: "能力差距"
							}), result.gaps.map((g, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									fontSize: 12,
									padding: "2px 0",
									color: t.warn
								},
								children: ["▸ ", g]
							}, i))]
						})
					] })
				]
			});
		};
		//#endregion
		//#region src/client/tabs/CostTab.tsx
		const FALLBACK_MODELS = [
			{
				key: "2",
				name: "DeepSeek-R1-Distill-Qwen-7B",
				api_price: 2.5,
				ref_cost: 2e3,
				ref_hardware: "RTX 3060 8G + 16G RAM"
			},
			{
				key: "7",
				name: "DeepSeek-V4-Flash",
				api_price: 2,
				ref_cost: null,
				ref_hardware: "需API调用"
			},
			{
				key: "17",
				name: "GPT-5.5 (OpenAI)",
				api_price: 210,
				ref_cost: null,
				ref_hardware: "需API调用"
			}
		];
		const FALLBACK_CAREERS = [
			{
				key: "1",
				name: "初级开发者",
				desc: "实习生/应届/1-2年",
				daily_default: 500
			},
			{
				key: "2",
				name: "中级开发者",
				desc: "3-5年经验",
				daily_default: 5e3
			},
			{
				key: "3",
				name: "高级开发者",
				desc: "架构师/专家",
				daily_default: 2e4
			},
			{
				key: "4",
				name: "重度AI用户",
				desc: "AI Native/Agent",
				daily_default: 1e5
			}
		];
		const FALLBACK_SCENES = [
			{
				key: "chat",
				label: "聊天对话"
			},
			{
				key: "rag",
				label: "RAG/检索"
			},
			{
				key: "codegen",
				label: "代码生成"
			},
			{
				key: "summarize",
				label: "文档总结"
			}
		];
		const cardStyle$2 = (t) => ({
			background: t.cardBg,
			border: `1px solid ${t.border}`,
			borderRadius: 10,
			padding: "10px 12px"
		});
		const labelStyle$2 = (t) => ({
			fontSize: 12,
			color: t.muted,
			display: "block",
			marginBottom: 3
		});
		const inputStyle$2 = (t) => ({
			width: "100%",
			padding: "6px 8px",
			borderRadius: 6,
			border: `1px solid ${t.border}`,
			fontSize: 12,
			boxSizing: "border-box",
			background: t.bg,
			color: t.text
		});
		function fmt(n) {
			if (!isFinite(n)) return "∞";
			return n >= 100 ? Math.round(n).toLocaleString() : Number(n.toFixed(2)).toString();
		}
		const CostTab = ({ store }) => {
			const t = useTheme();
			const params = useCockpit(store, (s) => s.costParams);
			const meta = useRpc(() => callRpc("meta", {}));
			const cost = useRpc(() => callRpc("cost", {
				modelKey: params.modelKey,
				scene: params.scene,
				careerKey: params.careerKey,
				hardwareCost: Number(params.hardwareCost) || void 0,
				roi: Number(params.roi) || void 0,
				lifespanYears: Number(params.lifespanYears) || void 0
			}));
			(0, react.useEffect)(() => {
				meta.run();
			}, []);
			const models = Array.isArray(meta.data?.models) ? meta.data.models : FALLBACK_MODELS;
			const careers = Array.isArray(meta.data?.careers) ? meta.data.careers : FALLBACK_CAREERS;
			const scenes = Array.isArray(meta.data?.scenes) ? meta.data.scenes : FALLBACK_SCENES;
			const selectedModel = models.find((m) => m.key === params.modelKey);
			const result = cost.data?.result;
			const inf = result?.daysToBreakEven === Infinity || result?.daysToBreakEven == null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 10
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: cardStyle$2(t),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									fontSize: 11,
									fontWeight: 700,
									letterSpacing: .5,
									color: t.muted,
									textTransform: "uppercase",
									marginBottom: 6
								},
								children: "本地部署 vs API 回本分析"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								style: labelStyle$2(t),
								children: "模型"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								style: inputStyle$2(t),
								value: params.modelKey,
								onChange: (e) => {
									const key = e.currentTarget.value;
									const m = models.find((x) => x.key === key);
									store.updateSlice("costParams", {
										modelKey: key,
										...m?.ref_cost ? { hardwareCost: String(m.ref_cost) } : {}
									});
								},
								children: [models.map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: m.key,
									children: m.name
								}, m.key)), models.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "2",
									children: "加载中…"
								})]
							}),
							selectedModel && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									fontSize: 11,
									color: t.muted,
									marginTop: 4
								},
								children: [
									"API ¥",
									selectedModel.api_price,
									"/百万Token · ",
									selectedModel.ref_hardware
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: 6,
									marginTop: 8
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: labelStyle$2(t),
									children: "使用场景"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
									style: inputStyle$2(t),
									value: params.scene,
									onChange: (e) => store.updateSlice("costParams", { scene: e.currentTarget.value }),
									children: scenes.map((s) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: s.key,
										children: s.label
									}, s.key))
								})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: labelStyle$2(t),
									children: "开发者水平"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
									style: inputStyle$2(t),
									value: params.careerKey,
									onChange: (e) => store.updateSlice("costParams", { careerKey: e.currentTarget.value }),
									children: careers.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: c.key,
										children: c.name
									}, c.key))
								})] })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "grid",
									gridTemplateColumns: "1fr 1fr 1fr",
									gap: 6,
									marginTop: 8
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										style: labelStyle$2(t),
										children: "硬件总价 ¥"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										style: inputStyle$2(t),
										type: "number",
										value: params.hardwareCost,
										onChange: (e) => store.updateSlice("costParams", { hardwareCost: e.currentTarget.value })
									})] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										style: labelStyle$2(t),
										children: "投入产出倍率"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										style: inputStyle$2(t),
										type: "number",
										step: "0.1",
										value: params.roi,
										onChange: (e) => store.updateSlice("costParams", { roi: e.currentTarget.value })
									})] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										style: labelStyle$2(t),
										children: "折旧年限"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										style: inputStyle$2(t),
										type: "number",
										value: params.lifespanYears,
										onChange: (e) => store.updateSlice("costParams", { lifespanYears: e.currentTarget.value })
									})] })
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						onClick: () => cost.run(),
						disabled: cost.loading,
						style: {
							padding: "9px 0",
							borderRadius: 6,
							border: `1px solid ${t.primary}`,
							color: t.primary,
							background: t.primarySoft,
							fontSize: 13,
							cursor: cost.loading ? "not-allowed" : "pointer",
							fontWeight: 700
						},
						children: cost.loading ? "计算中…" : "💰 成本回本分析"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(OutError, { error: cost.error }),
					result && result.error ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							color: t.bad,
							fontSize: 12
						},
						children: ["⚠ ", result.error]
					}) : result ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								padding: "4px 2px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: 13,
									fontWeight: 700
								},
								children: result.model?.name
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Badge, {
								tone: {
									strong: "good",
									consider: "warn",
									judge: "warn",
									warn: "bad"
								}[result.recommendation?.level] ?? "info",
								children: result.recommendation?.text
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: 6
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricCard, {
									label: "回本周期",
									value: inf ? "∞" : `${Math.round(result.daysToBreakEven)} 天`,
									sub: inf ? "本地部署不划算" : result.daysToBreakEven <= 30 ? "强烈推荐" : "按业务判断",
									color: inf ? t.bad : result.daysToBreakEven <= 90 ? t.good : t.warn
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricCard, {
									label: "回本需用Token",
									value: `${fmt(result.millionNeeded)}M`,
									sub: "每日消耗折算"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricCard, {
									label: "每日API费用",
									value: `¥${fmt(result.dailyApiCost)}`,
									sub: "含 ROI 折算",
									color: t.primary
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricCard, {
									label: "每日本地成本",
									value: `¥${fmt(result.dailyLocalCost)}`,
									sub: "电费+折旧"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricCard, {
									label: "每月节省",
									value: `¥${fmt(result.monthlySaving)}`,
									sub: result.monthlySaving > 0 ? "本地 vs API" : "暂无节省",
									color: result.monthlySaving > 0 ? t.good : t.muted
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricCard, {
									label: "加权单价",
									value: `¥${fmt(result.weightedPrice)}`,
									sub: "百万Token"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: cardStyle$2(t),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									fontSize: 11,
									fontWeight: 700,
									letterSpacing: .5,
									color: t.muted,
									textTransform: "uppercase",
									marginBottom: 6
								},
								children: "明细"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									fontSize: 11,
									color: t.muted,
									lineHeight: 1.6
								},
								children: [
									"每日电费 ¥",
									fmt(result.dailyElectricity),
									" · 每日折旧 ¥",
									fmt(result.dailyDepreciation),
									" · 场景 ",
									scenes.find((s) => s.key === params.scene)?.label
								]
							})]
						})
					] }) : null
				]
			});
		};
		//#endregion
		//#region src/client/tabs/SignalTab.tsx
		const cardStyle$1 = (t) => ({
			background: t.cardBg,
			border: `1px solid ${t.border}`,
			borderRadius: 10,
			padding: "10px 12px"
		});
		const labelStyle$1 = (t) => ({
			fontSize: 12,
			color: t.muted,
			display: "block",
			marginBottom: 3
		});
		const inputStyle$1 = (t) => ({
			width: "100%",
			padding: "6px 8px",
			borderRadius: 6,
			border: `1px solid ${t.border}`,
			fontSize: 12,
			boxSizing: "border-box",
			background: t.bg,
			color: t.text
		});
		const SignalTab = ({ store }) => {
			const t = useTheme();
			const input = useCockpit(store, (s) => s.signalInput);
			const signal = useRpc(() => {
				const parsed = input.series.split(/[,，\s]+/).map((s) => Number(s.trim())).filter((n) => !isNaN(n));
				return callRpc("signal", {
					sourceVerifiability: input.sourceVerifiability,
					paymentSignalPresent: input.paymentSignalPresent,
					anomalyFlags: input.anomaly ? ["manual_flag"] : [],
					timeSeries: parsed.length >= 2 ? parsed : void 0
				});
			});
			const result = signal.data?.assessment;
			const tone = result?.suggestedConfidence === "high" ? "good" : result?.suggestedConfidence === "medium" ? "warn" : "bad";
			const confLabel = {
				high: "高可信",
				medium: "中可信",
				low: "低可信"
			}[result?.suggestedConfidence] ?? "";
			const scoreColor = tone === "good" ? t.good : tone === "warn" ? t.warn : t.bad;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 10
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: cardStyle$1(t),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									fontSize: 11,
									fontWeight: 700,
									letterSpacing: .5,
									color: t.muted,
									textTransform: "uppercase",
									marginBottom: 6
								},
								children: "信号真实性评估"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: 6
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: labelStyle$1(t),
									children: "来源可验证性"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									style: inputStyle$1(t),
									value: input.sourceVerifiability,
									onChange: (e) => store.updateSlice("signalInput", { sourceVerifiability: e.currentTarget.value }),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "high",
											children: "高 · 官方/开源"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "medium",
											children: "中 · 社区"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "low",
											children: "低 · 匿名"
										})
									]
								})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: labelStyle$1(t),
									children: "真实付费信号"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									onClick: () => store.updateSlice("signalInput", { paymentSignalPresent: !input.paymentSignalPresent }),
									style: {
										width: "100%",
										padding: "6px 8px",
										borderRadius: 6,
										fontSize: 12,
										cursor: "pointer",
										border: `1px solid ${input.paymentSignalPresent ? t.good : t.border}`,
										color: input.paymentSignalPresent ? t.good : t.muted,
										background: input.paymentSignalPresent ? t.goodSoft : t.bg
									},
									children: input.paymentSignalPresent ? "✅ 有" : "⬜ 无"
								})] })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: { marginTop: 8 },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: labelStyle$1(t),
									children: "时间序列（逗号分隔）"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									style: inputStyle$1(t),
									value: input.series,
									onChange: (e) => store.updateSlice("signalInput", { series: e.currentTarget.value })
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Row, {
								gap: 8,
								style: { marginTop: 8 },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: input.anomaly,
									onChange: (e) => store.updateSlice("signalInput", { anomaly: e.currentTarget.checked })
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										fontSize: 12,
										color: t.muted
									},
									children: "额外异常标记（manual_flag）"
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						onClick: () => signal.run(),
						disabled: signal.loading,
						style: {
							padding: "9px 0",
							borderRadius: 6,
							border: `1px solid ${t.primary}`,
							color: t.primary,
							background: t.primarySoft,
							fontSize: 13,
							cursor: signal.loading ? "not-allowed" : "pointer",
							fontWeight: 700
						},
						children: signal.loading ? "评估中…" : "📡 信号真实性评分"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(OutError, { error: signal.error }),
					result && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								padding: "4px 2px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: 13,
									fontWeight: 700
								},
								children: "综合得分"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Badge, {
								tone,
								children: confLabel
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: cardStyle$1(t),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										fontSize: 28,
										fontWeight: 800,
										color: scoreColor
									},
									children: [Math.round((result.raw ?? 0) * 100), "%"]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: { marginTop: 6 },
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Bar, {
										value: result.raw ?? 0,
										color: scoreColor,
										height: 12
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "grid",
										gridTemplateColumns: "1fr 1fr",
										gap: 6,
										marginTop: 8
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: cardStyle$1(t),
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: {
												fontSize: 11,
												color: t.muted
											},
											children: "来源分"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												fontSize: 15,
												fontWeight: 700
											},
											children: [Math.round((result.verifiabilityScore ?? 0) * 100), "%"]
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: cardStyle$1(t),
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: {
												fontSize: 11,
												color: t.muted
											},
											children: "异常分"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												fontSize: 15,
												fontWeight: 700
											},
											children: [Math.round((result.anomalyScore ?? 0) * 100), "%"]
										})]
									})]
								})
							]
						}),
						result.reasons?.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: cardStyle$1(t),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									fontSize: 11,
									fontWeight: 700,
									letterSpacing: .5,
									color: t.muted,
									textTransform: "uppercase",
									marginBottom: 6
								},
								children: "判据理由"
							}), result.reasons.map((r, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									fontSize: 12,
									padding: "2px 0"
								},
								children: ["• ", r]
							}, i))]
						})
					] })
				]
			});
		};
		//#endregion
		//#region src/client/tabs/GraphTab.tsx
		const cardStyle = (t) => ({
			background: t.cardBg,
			border: `1px solid ${t.border}`,
			borderRadius: 10,
			padding: "10px 12px"
		});
		const labelStyle = (t) => ({
			fontSize: 12,
			color: t.muted,
			display: "block",
			marginBottom: 3
		});
		const inputStyle = (t) => ({
			width: "100%",
			padding: "6px 8px",
			borderRadius: 6,
			border: `1px solid ${t.border}`,
			fontSize: 12,
			boxSizing: "border-box",
			background: t.bg,
			color: t.text
		});
		const GraphTab = ({ store }) => {
			const t = useTheme();
			const projects = useCockpit(store, (s) => s.projects);
			const relations = useCockpit(store, (s) => s.relations);
			const rootPath = useCockpit(store, (s) => s.rootPath);
			const [files, setFiles] = (0, react.useState)(null);
			const scan = useRpc(() => callRpc("scan", { rootPath }));
			const graph = useRpc(() => callRpc("graph", {
				projects,
				capabilities: [],
				projectCaps: [],
				projectRelations: relations,
				rootPath
			}));
			async function doScan() {
				const r = await scan.run();
				if (r.ok) setFiles(r.data.files ?? []);
				else setFiles(null);
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 10
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: cardStyle(t),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									fontSize: 11,
									fontWeight: 700,
									letterSpacing: .5,
									color: t.muted,
									textTransform: "uppercase",
									marginBottom: 6
								},
								children: "扫描 & 构建"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								style: labelStyle(t),
								children: "根目录"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Row, {
								gap: 6,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									style: inputStyle(t),
									value: rootPath,
									onChange: (e) => store.setState((s) => ({
										...s,
										rootPath: e.currentTarget.value
									}))
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									onClick: doScan,
									disabled: scan.loading,
									style: {
										padding: "6px 14px",
										borderRadius: 6,
										border: `1px solid ${t.primary}`,
										color: t.primary,
										background: t.primarySoft,
										fontSize: 12,
										cursor: "pointer"
									},
									children: scan.loading ? "…" : "扫描"
								})]
							}),
							scan.error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OutError, { error: scan.error }),
							files != null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									fontSize: 11,
									color: t.muted,
									marginTop: 4,
									maxHeight: 60,
									overflow: "auto"
								},
								children: [
									files.length,
									" 个文件：",
									files.slice(0, 6).join(" · ")
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: cardStyle(t),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									fontSize: 11,
									fontWeight: 700,
									letterSpacing: .5,
									color: t.muted,
									textTransform: "uppercase",
									marginBottom: 6
								},
								children: "项目节点"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									display: "flex",
									flexDirection: "column",
									gap: 4
								},
								children: projects.map((p, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Row, {
									gap: 6,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											style: {
												...inputStyle(t),
												flex: 1
											},
											value: p.name,
											onChange: (e) => store.setState((s) => ({
												...s,
												projects: s.projects.map((x, j) => j === i ? {
													...x,
													name: e.currentTarget.value
												} : x)
											}))
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												fontSize: 11,
												color: t.muted,
												width: 40
											},
											children: "stack"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											style: {
												...inputStyle(t),
												width: 80
											},
											value: p.stack.join(","),
											onChange: (e) => store.setState((s) => ({
												...s,
												projects: s.projects.map((x, j) => j === i ? {
													...x,
													stack: e.currentTarget.value.split(",").filter(Boolean)
												} : x)
											}))
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												cursor: "pointer",
												fontSize: 12,
												color: t.muted
											},
											onClick: () => store.setState((s) => ({
												...s,
												projects: s.projects.filter((_, j) => j !== i)
											})),
											children: "✕"
										})
									]
								}, p.id))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								onClick: () => store.setState((s) => ({
									...s,
									projects: [...s.projects, {
										id: `p${Date.now()}`,
										name: "新项目",
										path: "",
										stack: [],
										tags: [],
										summary: ""
									}]
								})),
								style: {
									marginTop: 6,
									padding: "4px 10px",
									borderRadius: 6,
									border: `1px solid ${t.border}`,
									color: t.text,
									background: t.bg,
									cursor: "pointer",
									fontSize: 12
								},
								children: "＋ 添加项目"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: cardStyle(t),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									fontSize: 11,
									fontWeight: 700,
									letterSpacing: .5,
									color: t.muted,
									textTransform: "uppercase",
									marginBottom: 6
								},
								children: "项目关系"
							}),
							relations.map((r, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Row, {
								gap: 6,
								style: { marginBottom: 4 },
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										style: {
											...inputStyle(t),
											flex: 1
										},
										value: r.source,
										onChange: (e) => store.setState((s) => ({
											...s,
											relations: s.relations.map((x, j) => j === i ? {
												...x,
												source: e.currentTarget.value
											} : x)
										}))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											fontSize: 11,
											color: t.muted
										},
										children: "→"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										style: {
											...inputStyle(t),
											flex: 1
										},
										value: r.target,
										onChange: (e) => store.setState((s) => ({
											...s,
											relations: s.relations.map((x, j) => j === i ? {
												...x,
												target: e.currentTarget.value
											} : x)
										}))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										style: {
											...inputStyle(t),
											width: 90
										},
										value: r.type,
										onChange: (e) => store.setState((s) => ({
											...s,
											relations: s.relations.map((x, j) => j === i ? {
												...x,
												type: e.currentTarget.value
											} : x)
										})),
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "combine",
											children: "combine"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "overlap",
											children: "overlap"
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											cursor: "pointer",
											fontSize: 12,
											color: t.muted
										},
										onClick: () => store.setState((s) => ({
											...s,
											relations: s.relations.filter((_, j) => j !== i)
										})),
										children: "✕"
									})
								]
							}, r.id)),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								onClick: () => store.setState((s) => ({
									...s,
									relations: [...s.relations, {
										id: `r${Date.now()}`,
										source: "p1",
										target: "p2",
										type: "combine",
										confidence: .7,
										reason: ""
									}]
								})),
								style: {
									marginTop: 4,
									padding: "4px 10px",
									borderRadius: 6,
									border: `1px solid ${t.border}`,
									color: t.text,
									background: t.bg,
									cursor: "pointer",
									fontSize: 12
								},
								children: "＋ 添加关系"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						onClick: () => graph.run(),
						disabled: graph.loading,
						style: {
							padding: "9px 0",
							borderRadius: 6,
							border: `1px solid ${t.primary}`,
							color: t.primary,
							background: t.primarySoft,
							fontSize: 13,
							cursor: graph.loading ? "not-allowed" : "pointer",
							fontWeight: 700
						},
						children: graph.loading ? "构建中…" : "🌌 构建星座图谱"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(OutError, { error: graph.error }),
					graph.data?.graph && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							alignItems: "center"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(GraphCanvas, { data: graph.data.graph }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								fontSize: 11,
								color: t.muted,
								marginTop: 2
							},
							children: [
								graph.data.graph.nodes?.length ?? 0,
								" 节点 · ",
								graph.data.graph.projectRelations?.length ?? 0,
								" 关系边"
							]
						})]
					})
				]
			});
		};
		//#endregion
		//#region src/client/Panel.tsx
		const TABS = [
			{
				key: "orchestrate",
				label: "🧭 编排"
			},
			{
				key: "match",
				label: "🎯 选题"
			},
			{
				key: "cost",
				label: "💰 成本"
			},
			{
				key: "signal",
				label: "📡 信号"
			},
			{
				key: "graph",
				label: "🌌 图谱"
			}
		];
		const Panel = ({ store }) => {
			const t = useTheme();
			const [tab, setTab] = (0, react.useState)("orchestrate");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 10
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							display: "flex",
							gap: 6
						},
						children: TABS.map((tt) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							onClick: () => setTab(tt.key),
							style: {
								flex: 1,
								padding: "6px 0",
								borderRadius: 8,
								cursor: "pointer",
								fontSize: 12,
								fontWeight: 600,
								border: tab === tt.key ? `1px solid ${t.primary}` : `1px solid ${t.border}`,
								background: tab === tt.key ? t.primarySoft : t.bg,
								color: tab === tt.key ? t.primary : t.muted
							},
							children: tt.label
						}, tt.key))
					}),
					tab === "orchestrate" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OrchestrateTab, { store }),
					tab === "match" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MatchTab, { store }),
					tab === "cost" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CostTab, { store }),
					tab === "signal" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SignalTab, { store }),
					tab === "graph" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GraphTab, { store })
				]
			});
		};
		//#endregion
		//#region src/client/slots.tsx
		function createSettingsCard(ctx) {
			return function SettingsCard() {
				const t = useTheme();
				const [snap, setSnap] = (0, react.useState)({});
				const [loading, setLoading] = (0, react.useState)(true);
				(0, react.useEffect)(() => {
					let cancelled = false;
					(async () => {
						try {
							const response = await ctx.remote.settings.describe();
							if (!cancelled && response?.ok) {
								const ns = response.value.namespaces?.find((c) => c.ns === SETTINGS_NS);
								setSnap(ns?.value ?? {});
							}
						} catch (e) {
							console.warn("[cockpit] settings read failed", e);
						} finally {
							if (!cancelled) setLoading(false);
						}
					})();
					return () => {
						cancelled = true;
					};
				}, []);
				const write = (0, react.useCallback)(async (key, value) => {
					try {
						const response = await ctx.remote.settings.describe();
						const ns = response?.ok ? response.value.namespaces?.find((c) => c.ns === SETTINGS_NS) : void 0;
						await ctx.remote.settings.update(SETTINGS_NS, { [key]: value }, ns?.revision);
					} catch (e) {
						console.warn("[cockpit] settings write failed", e);
					}
				}, []);
				const field = (key) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: 8,
						marginBottom: 6
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							width: 90,
							color: t.muted
						},
						children: key
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						value: String(snap[key] ?? ""),
						onChange: (e) => {
							const v = e.currentTarget.value;
							setSnap((p) => ({
								...p,
								[key]: v
							}));
							write(key, v);
						},
						style: {
							flex: 1,
							padding: "3px 6px",
							borderRadius: 4,
							border: `1px solid ${t.border}`,
							background: t.bg,
							color: t.text
						}
					})]
				});
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: { color: t.muted },
					children: "加载中…"
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [field("rootPath"), field("baseURL")] }) });
			};
		}
		//#endregion
		//#region src/client/index.tsx
		/**
		* dsh-project-cockpit · Client 入口（浏览器半）。
		*
		* 资源所有权：所有 DOM 节点、React root、icon 注册、settings slot 都通过
		* ctx.effect 注册 disposer，HMR / dispose 时自动清理，无手动 ctx.on('dispose')。
		*/
		const inject = [
			"slots",
			"remote",
			"remote.settings"
		];
		function apply(ctx) {
			if (typeof window === "undefined") return;
			const store = createCockpitStore();
			let root = null;
			let container = null;
			ctx.effect(() => {
				const el = document.createElement("div");
				el.style.display = "none";
				document.body.appendChild(el);
				container = el;
				root = (0, react_dom_client.createRoot)(el);
				return () => {
					try {
						root?.unmount();
					} catch {}
					root = null;
					el.remove();
					container = null;
				};
			}, "cockpit:root");
			let panelVisible = false;
			function renderPanelContent() {
				if (!root || !container) return;
				root.render(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThemeProvider, {
					mode: "auto",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FloatingPanel, {
						title: "🛰️ 项目驾驶舱",
						onClose: () => {
							panelVisible = false;
							if (container) container.style.display = "none";
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Panel, { store })
					})
				}));
			}
			function togglePanel() {
				if (!container) return;
				panelVisible = !panelVisible;
				if (panelVisible) {
					renderPanelContent();
					container.style.display = "block";
				} else container.style.display = "none";
			}
			ctx.effect(() => {
				const registry = window.__dshIconRegistry ??= [];
				const entry = {
					id: REGISTRY_ID,
					icon: "🛰️",
					label: "项目驾驶舱",
					onClick: togglePanel
				};
				const dup = registry.findIndex((e) => e.id === entry.id);
				if (dup >= 0) registry.splice(dup, 1);
				registry.push(entry);
				return () => {
					const i = registry.findIndex((e) => e.id === entry.id);
					if (i >= 0) registry.splice(i, 1);
				};
			}, "cockpit:icon");
			ctx.effect(() => {
				try {
					const SettingsCard = createSettingsCard(ctx);
					const dispose = ctx.slots?.render?.("settings.plugin.item", SettingsCard);
					return () => {
						try {
							dispose?.();
						} catch {}
					};
				} catch (e) {
					console.warn("[cockpit] settings slot failed", e);
					return () => {};
				}
			}, "cockpit:settings");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map