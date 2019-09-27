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
        if (Math.abs(rx) < playerRect.width / 2 && Math.abs(ry) < playerRect.height / 2) {
            if (ctx.pos.carry) {
                ctx.setLevel(dropItem(ctx));
            }
            return;
        }
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

function useTimers(timers) {
    // Caller should make sure the list of timers doesn't change
    React.useEffect(() => {
        const ids = Array(timers.length);
        for (let i = 0; i < timers.length; i++) {
            ids[i] = setTimeout(timers[i][0], timers[i][1]);
        }
        return () => {
            for (let i = 0; i < ids.length; i++) {
                clearTimeout(ids[i]);
            }
        };
    // eslint-disable-next-line
    }, []);
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
    const addCallbacks = () => {
        const animateClasses = ["animate-eat", "animate-shake", "animate-drop"];
        const addAnimateFunc = className => () => {
            const elem = ref.current;
            elem.classList.remove(...animateClasses);
            void elem.offsetWidth;
            elem.classList.add(className);
        };
        ctx.pos.animateEat = addAnimateFunc("animate-eat");
        ctx.pos.animateShake = addAnimateFunc("animate-shake");
        ctx.pos.animateDrop = addAnimateFunc("animate-drop");
    }; // Prevent exhaustive-deps eslint rule from firing
    React.useEffect(addCallbacks, []);
    return (
        <div className="player" style={style}
            ref={ref}>
            {/* eslint-disable */}
            &#x1f642;
            {/* eslint-enable */}
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

function Obj(props) {
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
        level.pos.animateShake();
        return {};
    } else {
        next.pos.carry = level.objects.splice(index, 1)[0].type;
        level.pos.animateEat();
    }
    return next;
}
function dropItem(level) {
    const next = {...level, pos: {...level.pos}};
    next.objects.push({
        ...level.pos,
        type: level.pos.carry,
    });
    next.pos.carry = null;
    level.pos.animateDrop();
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
        interact: level => {
            level.pos.animateShake();
            return {};
        },
    },
    lock: {
        className: "lock",
        render: () => <>&#x1f512;</>,
        interact: (level, next, index) => {
            if (level.pos.carry && level.pos.carry.what === ObjType.key.what) {
                level.objects.splice(index, 1);
                next.pos.carry = null;
                level.pos.animateEat();
                return next;
            }
            level.pos.animateShake();
            return {};
        },
    },
    key: {
        className: "lock",
        render: () => <>&#x1f511;</>,
        what: "key",
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
                    <div className="popover" onTouchStart={e => e.stopPropagation()}>
                        <div className="speech">
                            <div className="who">
                                {/* eslint-disable */}
                                &#x1f468;&#x1f3fb;
                                {/* eslint-enable */}
                            </div>
                            <div className="what">
                                <Square color={o.type.wants} d={40} shadow/>
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
        addObjectsOfType(level, type, ...args);
    };
}
function addObjectsOfType(level, type, ...args) {
    for (let i = 0; i < args.length; i++) {
        level.objects.push({...args[i], type});
    }
}
function shuffle(array) {
    const n = array.length;
    for (let i = 0; i < n; i++) {
        const x = i + Math.floor(Math.random() * (n - i));
        const t = array[x];
        array[x] = array[i];
        array[i] = t;
    }
    return array;
}
function chooseN(array, n) {
    let len = array.length;
    if (n > len) {
        throw new RangeError(`chooseN: cannot choose ${n} of ${len}`);
    }
    for (let i = 0; i < n; i++) {
        const x = i + Math.floor(Math.random() * (len - i));
        if (x !== i) {
            [array[i], array[x]] = [array[x], array[i]];
        }
    };
    return array.slice(0, n);
};

export const colors = [
    // darker colors
    "rgb(169,0,0)",
    "rgb(77,71,0)",
    "rgb(0,106,46)",
    "rgb(0,82,158)",
    "rgb(129,0,130)",
    // brighter colors
    "rgb(255,175,0)",
    "rgb(0,218,231)",
    "rgb(255,121,216)",
    "rgb(255,184,38)",
    "rgb(0,255,45)",
];

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
                {level.objects.map((pos, i) => <Obj key={i} pos={pos}/>)}
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
        ...baseLevel, _name: "t9", setLevel,
        pos: {x: 3, y: 1},
        onLoad: level => {
            const add = (...args) => addObjectsOfType(level, ...args);
            add(ObjType.target, {x: 3, y: 5});
            const [a, b] = chooseN(colors, 2);
            const c = Math.random() < .5 ? a : b;
            add({...ObjType.npc, wants: c}, {x: 3, y: 3});
            add({...ObjType.figure, what: a}, {x: 1, y: 1});
            add({...ObjType.figure, what: b}, {x: 5, y: 1});
            add(ObjType.wall,
                {x: 0, y: 3}, {x: 1, y: 3}, {x: 2, y: 3},
                {x: 4, y: 3}, {x: 5, y: 3}, {x: 6, y: 3});
        },
        nextLevel: winAndSetNextByTemplate(levels.t9, setLevel),
    }),
    t9: setLevel => ({
        ...baseLevel, _name: "t10", setLevel,
        pos: {x: 1, y: 1},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 5, y: 1}),
            $addObjectsOfType(ObjType.key, {x: 5, y: 5}),
            $addObjectsOfType(ObjType.lock,
                {x: 3, y: 0}, {x: 3, y: 1}, {x: 3, y: 2},
                {x: 4, y: 3}, {x: 5, y: 3}, {x: 6, y: 3}),
            $addObjectsOfType(ObjType.wall, {x: 3, y: 3}),
        ],
        nextLevel: winAndSetNextByTemplate(levels.t10, setLevel),
    }),
    t10: setLevel => ({
        ...baseLevel, _name: "t10", setLevel,
        pos: {x: 2, y: 3},
        onLoad: level => {
            const add = (...args) => addObjectsOfType(level, ...args);
            const cc = chooseN(colors, 2);
            add(ObjType.target, {x: 6, y: 0}, {x: 6, y: 3}, {x: 6, y: 6});
            add(ObjType.lock, {x: 4, y: 3});
            add({...ObjType.npc, wants: cc[0]}, {x: 4, y: 1});
            add({...ObjType.npc, wants: cc[1]}, {x: 4, y: 5});
            add(ObjType.wall,
                {x: 0, y: 0}, {x: 0, y: 2}, {x: 0, y: 4}, {x: 0, y: 6},
                {x: 4, y: 0}, {x: 4, y: 6},
                {x: 4, y: 2}, {x: 5, y: 2}, {x: 6, y: 2},
                {x: 4, y: 4}, {x: 5, y: 4}, {x: 6, y: 4},
            );
            add(ObjType.key, {x: 0, y: 1});
            shuffle(cc);
            add({...ObjType.figure, what: cc[0]}, {x: 0, y: 3});
            add({...ObjType.figure, what: cc[1]}, {x: 0, y: 5});
        },
        nextLevel: winAndSetNextByTemplate(levels.t11, setLevel),
    }),
    t11: setLevel => ({
        ...baseLevel, _name: "t11", setLevel,
        pos: {x: 1, y: 2},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 5, y: 6}),
            $addObjectsOfType(ObjType.lock, {x: 5, y: 4}),
            $addObjectsOfType({...ObjType.npc, wants: "rgb(0,220,184)"}, {x: 1, y: 4}),
            $addObjectsOfType(ObjType.wall,
                {x: 1, y: 0}, {x: 3, y: 0}, {x: 5, y: 0},
                {x: 0, y: 4}, {x: 2, y: 4}, {x: 3, y: 4}, {x: 4, y: 4}, {x: 6, y: 4},
                {x: 3, y: 5}, {x: 3, y: 6},
            ),
            $addObjectsOfType(ObjType.key, {x: 1, y: 6}),
            // TODO: add randiomization
            $addObjectsOfType({...ObjType.figure, what: "rgb(255,111,189)"}, {x: 0, y: 0}),
            $addObjectsOfType({...ObjType.figure, what: "rgb(244,170,0)"}, {x: 2, y: 0}),
            $addObjectsOfType({...ObjType.figure, what: "rgb(0,220,184)"}, {x: 4, y: 0}),
            $addObjectsOfType({...ObjType.figure, what: "rgb(55,183,255)"}, {x: 6, y: 0}),
        ],
        nextLevel: winAndSetNextByTemplate(levels.t12, setLevel),
    }),
    t12: setLevel => ({
        ...baseLevel, _name: "t12", setLevel,
        pos: {x: 3, y: 2},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 3, y: 6}),
            $addObjectsOfType(ObjType.wall,
                {x: 2, y: 4}, {x: 2, y: 5}, {x: 2, y: 6},
                {x: 4, y: 4}, {x: 4, y: 5}, {x: 4, y: 6},
                {x: 0, y: 0}, {x: 0, y: 2}, {x: 0, y: 4}, {x: 0, y: 6},
                {x: 6, y: 0}, {x: 6, y: 2}, {x: 6, y: 4}, {x: 6, y: 6},
                {x: 2, y: 0}, {x: 4, y: 0},
            ),
            level => {
                const colors = ["rgb(255,111,189)","rgb(255,118,24)",
                    "rgb(255,146,0)","rgb(227,177,0)","rgb(120,202,0)",
                    "rgb(0,217,129)","rgb(0,220,223)","rgb(0,211,255)",
                    "rgb(0,190,255)","rgb(182,161,255)","rgb(255,130,255)"];
                shuffle(colors);
                const coords = [
                    {x: 1, y: 0}, {x: 3, y: 0}, {x: 5, y: 0},
                    {x: 0, y: 1}, {x: 0, y: 3}, {x: 0, y: 5},
                    {x: 6, y: 1}, {x: 6, y: 3}, {x: 6, y: 5},
                    {x: 1, y: 6}, {x: 5, y: 6},
                ];
                console.assert(colors.length === coords.length);
                for (let i = 0; i < coords.length; i++) {
                    level.objects.push({ ...coords[i],
                        type: {...ObjType.figure, what: colors[i]}});
                }
                const index = Math.floor(Math.random() * colors.length);
                level.objects.push({ x: 3, y: 4,
                    type: {...ObjType.npc, wants: colors[index]}});
            },
        ],
        nextLevel: winAndSetNextByTemplate(levels.t1, setLevel),
    }),
    win: next => setLevel => ({
        ...baseLevel, _name: "win", setLevel,
        render: function Win({ level }) {
            const [state, setState] = React.useState({});
            const ref = React.useRef();
            const showNextButton = () => {
                setState(prev => ({...prev, next: true}));
                ref.current.focus();
            };
            const showLevelsButton = () => {
                setState(prev => ({...prev, list: true}));
            };
            useTimers([
                [showNextButton, inputCooldownMs],
                [showLevelsButton, 2000],
            ]);
            const listLevels = () => setLevel(startLevel(levels.chooseLevel(setLevel)));
            return (
                <div className="win-level" style={computeLevelStyle(level)}>
                    {state.next && <button onClick={next} ref={ref}
                        className="next">&#x25b6;&#xFE0E;</button>}
                    {state.list && <button onClick={listLevels}
                        className="list"></button>}
                </div>
            );
        },
    }),
    chooseLevel: setLevel => ({
        ...baseLevel, _name: "choose", setLevel,
        render: ({ level }) => {
            const onChoose = level => setLevel(startLevel(level(setLevel)));
            return (
                <div className="choose-level" style={computeLevelStyle(level)}>
                    <ChooseLevels onChoose={onChoose} levels={
                        [
                            levels.t1, levels.t2, levels.t3, levels.t4, levels.t5,
                            levels.t6, levels.t7, levels.t8, levels.t9, levels.t10,
                            levels.t11, levels.t12,
                        ]}/>
                </div>
            );
        },
    }),
};
const firstLevel = levels.t1;

function computeLevelStyle(level) {
    const width = level.width * level.d;
    const height = level.height * level.d;
    const style = {
        width: `${width}px`, height: `${height}px`,
        tabIndex: 0,
    };
    return style;
}

function ChooseLevels({ onChoose, levels }) {
    return (
        <div className="level-list">
            {levels.map((level, i) => {
                return (
                    <button key={i} onClick={() => onChoose(level)}>
                        {i + 1}
                    </button>
                );
            })}
        </div>
    );
}

function startLevel(level) {
    const result = Object.assign(level);
    level.objects.length = 0;
    if (Array.isArray(level.onLoad)) {
        level.onLoad.map(f => f(result));
    } else if (typeof level.onLoad === "function") {
        level.onLoad(level);
    } else if (level.onLoad !== undefined){
        console.warn(level);
        throw new TypeError(`Unknown type for onLoad: ${typeof level.onLoad}`);
    }
    if (level.pos !== undefined) {
        level.pos.carry = null;
    }
    console.log("startLevel", result);
    return result;
}

export function Walkie(props) {
    const [level, _setLevel] = React.useState(null);
    const setLevel = (...args) => {
        _setLevel(...args);

    };
    const onStart = () => {
        setLevel(startLevel((props.startLevel || firstLevel)(setLevel)));
    }; // Prevent exhaustive-deps eslint rule from firing
    React.useEffect(onStart, []);
    if (level === null) {
        return null;
    }
    const RenderLevel = level.render;
    return (
        <div className="walkie">
            <Ctx.Provider value={level}>
                <RenderLevel level={level}/>
            </Ctx.Provider>
        </div>
    );
}

function Footer() {
    const [show, setShow] = React.useState(true);
    useTimers([
        [() => !isDev && setShow(false), 3000],
    ]);
    const version = document.getElementById("root").attributes["data-version"].value;
    const classNames = (isDev ? "dev" : "") + (show ? "" : " hidden");
    return (
        <footer className={classNames}>
            {version} &middot; https://github.com/goodrone/walkie-game
        </footer>
    );
}

function App() {
    return (
        <>
            <div className="app">
                <Walkie/>
            </div>
            <Footer/>
        </>
    );
}

const isDev = process.env.NODE_ENV !== 'production';

export default App;
