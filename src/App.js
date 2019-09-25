import React from 'react';
import './App.css';

function Map(props) {
    const ctx = React.useContext(Ctx);
    const ref = React.useRef();
    const style = {
        position: "relative",
        background: "#333",
        width: `${ctx.width * ctx.d}px`,
        height: `${ctx.height * ctx.d}px`,
    };
    const moveUp = () => ctx.setLevel(props.onSetPlayerPos({x: ctx.pos.x, y: ctx.pos.y - 1}));
    const moveDown = () => ctx.setLevel(props.onSetPlayerPos({x: ctx.pos.x, y: ctx.pos.y + 1}));
    const moveLeft = () => ctx.setLevel(props.onSetPlayerPos({x: ctx.pos.x - 1, y: ctx.pos.y}));
    const moveRight = () => ctx.setLevel(props.onSetPlayerPos({x: ctx.pos.x + 1, y: ctx.pos.y}));
    const handler = e => {
        const rect = ref.current.getBoundingClientRect();
        const playerRect = calcCellPos(ctx.pos, ctx);
        const p = e.touches[0];
        const rx = p.clientX - (rect.left + playerRect.x) - playerRect.width / 2;
        const ry = p.clientY - (rect.top + playerRect.y) - playerRect.height / 2;
        if (ry > rx) {
            if (rx + ry > 0) moveDown();
            else moveLeft();
        } else {
            if (rx + ry > 0) moveRight();
            else moveUp();
        }
    };
    const keyHandler = e => {
        if (e.key === "ArrowLeft") moveLeft();
        else if (e.key === "ArrowRight") moveRight();
        else if (e.key === "ArrowDown") moveDown();
        else if (e.key === "ArrowUp") moveUp();
    };
    React.useEffect(() => {
        if (!ctx.popover) {
            ref.current.focus();
        }
    });
    return <div style={style} onTouchStart={handler} onKeyDown={keyHandler}
        tabIndex="0" ref={ref} className="map">{props.children}</div>;
}

function calcCellPos(pos, level) {
    return {
        x: pos.x * level.d,
        y: pos.y * level.d,
        width: level.d,
        height: level.d,
    };
}

function cellPosToStyle(cell) {
    return {
        left: `${cell.x}px`,
        top: `${cell.y}px`,
        width: `${cell.width}px`,
        height: `${cell.height}px`,
    };
}

function Player(props) {
    const ctx = React.useContext(Ctx);
    const ref = React.useRef();
    const cell = calcCellPos(ctx.pos, ctx);
    const style = cellPosToStyle(cell);
    // Prevent exhaustive-deps linter rule from firing
    const addCallbacks = () => {
        ctx.pos.animateEat = () => {
            const elem = ref.current;
            elem.classList.remove("animate-eat");
            void elem.offsetWidth;
            elem.classList.add("animate-eat");
        };
        ctx.pos.animateShake = () => {
            const elem = ref.current;
            elem.classList.remove("animate-shake");
            void elem.offsetWidth;
            elem.classList.add("animate-shake");
        };
    };
    React.useEffect(addCallbacks, []);
    return (
        <div className="player" style={style}
            ref={ref}>
            &#x1f642;
            {ctx.pos.carry &&
                <span className="carry">
                    {ctx.pos.carry.render({
                        className: ctx.pos.carry.className,
                        it: ctx.pos.carry,
                    })}
                </span>}
        </div>
    );
}

function Object_(props) {
    const ctx = React.useContext(Ctx);
    const cell = calcCellPos(props.pos, ctx);
    const style = cellPosToStyle(cell);
    const type = props.pos.type;
    return (
        <div className={type.className} style={style}>
            {type.render && type.render({it: props.pos.type})}
        </div>
    );
}

const Ctx = React.createContext();

function clamp(x, a, b) {
    return x < a ? a : x > b ? b : x;
}

function sanitizePlayerPos(pos, level) {
    const results = {
        pos: {
            ...level.pos,
            x: clamp(pos.x, 0, level.width - 1),
            y: clamp(pos.y, 0, level.height - 1),
        },
    };
    const x = findCollisionInArray(pos, level.objects);
    if (x !== null) {
        const o = level.objects[x];
        if (typeof o.type.interact === "function") {
            return o.type.interact(level, results, x);
        } else {
            return {};
        }
    }
    return results;
}

function findCollisionInArray(pos, array, n) {
    const len = n === undefined ? array.length : n;
    let result = null;
    for (let i = 0; i < len; i++) {
        if (isCollision(pos, array[i])) {
            result = i;
            break;
        }
    }
    return result;
}

export function isCollision(a, b) {
    return a.x === b.x && a.y === b.y;
}

function numberOfObjTypes(array, type) {
    let result = 0;
    for (let i = 0; i < array.length; i++) {
        if (array[i].type === type) {
            result += 1;
        }
    }
    return result;
}

const inputCooldownMs = 600;

function Square({ d, color, shadow, className }) {
    const style = {
        boxShadow: shadow && "0 0 10px 1px #d4d4d4",
        margin: "auto",
    };
    return (
        <svg width={d} height={d} style={style} className={className}>
            <rect width={d} height={d} fill={color}/>
        </svg>
    );
}

function carryItem(level, next, index) {
    if (level.pos.carry) {
        next.pos.carry = level.objects.splice(index, 1, {
            ...next.pos,
            type: level.pos.carry,
        })[0].type;
        next.pos.x = level.pos.x;
        next.pos.y = level.pos.y;
    } else {
        next.pos.carry = level.objects.splice(index, 1)[0].type;
    }
    return next;
}

const ObjType = {
    target: {
        className: "target",
        render: () => <>&#x1f352;</>,
        interact: (level, next, index) => {
            next.score = level.score + 1;
            level.objects.splice(index, 1);
            if (numberOfObjTypes(level.objects, ObjType.target) === 0) {
                return level.nextLevel(level.setLevel);
            }
            level.pos.animateEat();
            return next;
        },
    },
    wall: {
        className: "wall",
    },
    lock: {
        className: "lock",
        render: () => <>&#x1f512;</>,
        interact: (level, next, index) => {
            if (!level.pos.carry) {
                level.pos.animateShake();
                return {};
            }
            level.objects.splice(index, 1);
            next.pos.carry = null;
            level.pos.animateEat();
            return next;
        },
    },
    key: {
        className: "lock",
        render: () => <>&#x1f511;</>,
        interact: carryItem,
    },
    figure: {
        className: "figure",
        render: (props) => (
            <Square color={props.it.what} d={30} className={(props || {}).className || null}/>
        ),
        interact: carryItem,
    },
    npc: {
        className: "npc",
        render: () => <>&#x1f468;&#x1f3fb;</>,
        interact: (level, next, index) => {
            const o = level.objects[index];
            if (level.pos.carry && level.pos.carry.what === o.type.wants) {
                level.objects.splice(index, 1);
                next.pos.carry = null;
                level.pos.animateEat();
                return next;
            }
            level.popover = function Popover() {
                const [ready, setReady] = React.useState();
                const ref = React.useRef();
                React.useEffect(() => {
                    const t = setTimeout(() => {
                        setReady(true);
                        ref.current.focus();
                    }, inputCooldownMs);
                    return () => clearTimeout(t);
                }, []);
                const dismiss = e => {
                    ready && level.setLevel(prev => ({...prev, popover: null}));
                };
                return (
                    <div className="popover">
                        <div className="speech">
                            <div className="who">
                                &#x1f468;&#x1f3fb;
                            </div>
                            <div className="what">
                                <Square color="red" d={40} shadow/>
                            </div>
                        </div>
                        <button onClick={dismiss} className={ready && "show"} ref={ref}>
                            &#x2713;
                        </button>
                    </div>
                );
            };
            return {};
        },
    },
};

function $addObjectsOfType(type, ...args) {
    return level => {
        for (let i = 0; i < args.length; i++) {
            level.objects.push({...args[i], type});
        }
    };
}

const baseLevel = {
    _name: "base",
    d: 45,
    width: 7, height: 7,
    score: 0,
    objects: [],
    walk: pos => prev => ({...prev, ...sanitizePlayerPos(pos, prev)}),
    render: ({ level }) => {
        return (
            <Map onSetPlayerPos={level.walk}>
                {level.objects.map((pos, i) => <Object_ key={i} pos={pos}/>)}
                <Player/>
                {level.popover && level.popover()}
            </Map>
        );
    },
};
function winAndSetNextByTemplate(template, setLevel) {
    return setLevel => {
        const next = () => setLevel(startLevel(template(setLevel)));
        setLevel(startLevel(levels.win(next)(setLevel)));
    }
}
export const levels = {
    t1: setLevel => ({
        ...baseLevel, _name: "t1", setLevel,
        pos: {x: 2, y: 3, carry: ObjType.key},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 4, y: 3}),
        ],
        nextLevel: winAndSetNextByTemplate(levels.t2, setLevel),
    }),
    t2: setLevel => ({
        ...baseLevel, _name: "t2", setLevel,
        pos: {x: 1, y: 1},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 5, y: 5}),
            $addObjectsOfType(ObjType.wall,
                {x: 4, y: 1}, {x: 5, y: 1}, {x: 5, y: 2},
                {x: 1, y: 4}, {x: 1, y: 5}, {x: 2, y: 5}),
        ],
        nextLevel: winAndSetNextByTemplate(levels.t3, setLevel),
    }),
    t3: setLevel => ({
        ...baseLevel, _name: "t3", setLevel,
        pos: {x: 1, y: 3},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 5, y: 3}),
            $addObjectsOfType(ObjType.wall, {x: 3, y: 2}, {x: 3, y: 3}, {x: 3, y: 4}),
        ],
        nextLevel: winAndSetNextByTemplate(levels.t4, setLevel),
    }),
    t4: setLevel => ({
        ...baseLevel, _name: "t4", setLevel,
        pos: {x: 2, y: 1},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 2, y: 5}),
            $addObjectsOfType(ObjType.wall,
                {x: 0, y: 3}, {x: 1, y: 3}, {x: 2, y: 3}, {x: 3, y: 3}, {x: 4, y: 3}),
        ],
        nextLevel: winAndSetNextByTemplate(levels.t5, setLevel),
    }),
    t5: setLevel => ({
        ...baseLevel, _name: "t5", setLevel,
        pos: {x: 3, y: 3},
        onLoad: [
            $addObjectsOfType(ObjType.target,
                {x: 1, y: 1}, {x: 1, y: 5}, {x: 5, y: 1}, {x: 5, y: 5}),
            $addObjectsOfType(ObjType.wall,
                {x: 1, y: 3}, {x: 3, y: 1}, {x: 5, y: 3}, {x: 3, y: 5},
                {x: 0, y: 3}, {x: 3, y: 0}, {x: 6, y: 3}, {x: 3, y: 6}),
        ],
        nextLevel: winAndSetNextByTemplate(levels.t6, setLevel),
    }),
    t6: setLevel => ({
        ...baseLevel, _name: "t6", setLevel,
        pos: {x: 1, y: 1},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 5, y: 1}),
            $addObjectsOfType(ObjType.wall,
                {x: 3, y: 0}, {x: 3, y: 1}, {x: 3, y: 2}, {x: 3, y: 3},
                {x: 1, y: 3}, {x: 1, y: 4}, {x: 1, y: 5},
                {x: 5, y: 3}, {x: 5, y: 4}, {x: 5, y: 5},
                {x: 2, y: 5}, {x: 3, y: 5}, {x: 4, y: 5}),
        ],
        nextLevel: winAndSetNextByTemplate(levels.t7, setLevel),
    }),
    t7: setLevel => ({
        ...baseLevel, _name: "t7", setLevel,
        pos: {x: 1, y: 3},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 5, y: 1}),
            $addObjectsOfType(ObjType.lock, {x: 3, y: 2}),
            $addObjectsOfType(ObjType.key, {x: 5, y: 5}),
            $addObjectsOfType(ObjType.wall,
                {x: 3, y: 0}, {x: 3, y: 1}, {x: 3, y: 3}, {x: 4, y: 3},
                {x: 5, y: 3}, {x: 6, y: 3}),
        ],
        nextLevel: winAndSetNextByTemplate(levels.t8, setLevel),
    }),
    t8: setLevel => ({
        ...baseLevel, _name: "t8", setLevel,
        pos: {x: 3, y: 1},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 3, y: 5}),
            $addObjectsOfType({...ObjType.npc, wants: "red"}, {x: 3, y: 3}),
            $addObjectsOfType({...ObjType.figure, what: "red"}, {x: 1, y: 1}),
            $addObjectsOfType({...ObjType.figure, what: "green"}, {x: 5, y: 1}),
            $addObjectsOfType(ObjType.wall,
                {x: 0, y: 3}, {x: 1, y: 3}, {x: 2, y: 3},
                {x: 4, y: 3}, {x: 5, y: 3}, {x: 6, y: 3}),
        ],
        nextLevel: winAndSetNextByTemplate(levels.t1, setLevel),
    }),
    win: next => setLevel => ({
        ...baseLevel,
        _name: "win",
        setLevel,
        render: function Win() {
            const b = baseLevel;
            const width = b.width * b.d;
            const height = b.height * b.d;
            const style = {
                width: `${width}px`, height: `${height}px`,
                tabIndex: 0,
            };
            const [show, setShow] = React.useState(false);
            const ref = React.useRef();
            React.useEffect(() => {
                const t = setTimeout(() => {
                    setShow(true);
                    ref.current.focus();
                }, inputCooldownMs);
                return () => clearTimeout(t);
            }, []);
            return (
                <div className="win-level" style={style}>
                    {show && <button onClick={next} ref={ref}>&#x25b6;&#xFE0E;</button>}
                </div>
            );
        },
    }),
};
const firstLevel = levels.t1;

function startLevel(level) {
    const result = Object.assign(level);
    level.objects.length = 0;
    if (Array.isArray(level.onLoad)) {
        level.onLoad.map(f => f(result));
    }
    if (level.pos !== undefined) {
        level.pos.carry = null;
    }
    return result;
}

export function Walkie(props) {
    const [level, _setLevel] = React.useState(null);
    const setLevel = (...args) => {
        _setLevel(...args);

    };
    React.useEffect(() => {
        setLevel(startLevel((props.startLevel || firstLevel)(setLevel)));
    }, []);
    if (level === null) {
        return null;
    }
    const RenderLevel = level.render;
    return (
        <div className="walkie">
            <Ctx.Provider value={level}>
                <div>{level._name}</div>
                <RenderLevel level={level}/>
            </Ctx.Provider>
        </div>
    );
}

function App() {
  return (
      <div className="app">
          <Walkie/>
      </div>
  );
}

export default App;
