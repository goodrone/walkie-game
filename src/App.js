import React from 'react';
import { HashRouter, withRouter } from "react-router-dom";
import { Numpad } from './Numpad.js';
import './App.css';

function Map(props) {
    const level = React.useContext(Level);
    const ref = React.useRef();
    const style = {
        position: "relative",
        background: "#333",
        width: `${level.width * level.d}px`,
        height: `${level.height * level.d}px`,
    };
    const move = (dx, dy) => {
        const next = props.onSetPlayerPos({
            x: level.pos.x + dx,
            y: level.pos.y + dy,
        });
        level.setLevel(next);
    };
    const moveUp = () => move(0, -1);
    const moveDown = () => move(0, 1);
    const moveLeft = () => move(-1, 0);
    const moveRight = () => move(1, 0);
    const handler = e => {
        const rect = ref.current.getBoundingClientRect();
        const playerRect = calcCellPos(level.pos, level);
        const p = e.touches[0];
        const rx = p.clientX - (rect.left + playerRect.x) - playerRect.width / 2;
        const ry = p.clientY - (rect.top + playerRect.y) - playerRect.height / 2;
        if (Math.abs(rx) < playerRect.width / 2 && Math.abs(ry) < playerRect.height / 2) {
            if (level.pos.carry) {
                level.setLevel(dropItem(level));
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
        else if (e.key === "Enter") {
            if (level.pos.carry) {
                level.setLevel(dropItem(level));
            }
        }
    };
    React.useEffect(() => {
        if (!level.popover) {
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

function rectToStyle(topLeft, bottomRight) {
    const width = bottomRight.x - topLeft.x + bottomRight.width;
    const height = bottomRight.y - topLeft.y + bottomRight.height;
    return {
        left: `${topLeft.x}px`,
        top: `${topLeft.y}px`,
        width: `${width}px`,
        height: `${height}px`,
    };
}

function Player(props) {
    const level = React.useContext(Level);
    const ref = React.useRef();
    const cell = calcCellPos(level.pos, level);
    const style = cellPosToStyle(cell);
    const addCallbacks = () => {
        const animateClasses = ["animate-eat", "animate-shake", "animate-drop",
            "animate-teleport"];
        const addAnimateFunc = className => () => {
            const elem = ref.current;
            elem.classList.remove(...animateClasses);
            void elem.offsetWidth;
            elem.classList.add(className);
        };
        level.pos.stopAnimations = () => {
            ref.current.classList.remove(...animateClasses);
        };
        level.pos.animateEat = addAnimateFunc("animate-eat");
        level.pos.animateShake = addAnimateFunc("animate-shake");
        level.pos.animateDrop = addAnimateFunc("animate-drop");
        level.pos.animateTeleport = (cur, in_, out, end) => {
            const elem = ref.current;
            elem.style.setProperty("--cur-x", cur.x + "px");
            elem.style.setProperty("--cur-y", cur.y + "px");
            elem.style.setProperty("--in-x", in_.x + "px");
            elem.style.setProperty("--in-y", in_.y + "px");
            elem.style.setProperty("--out-x", out.x + "px");
            elem.style.setProperty("--out-y", out.y + "px");
            elem.style.setProperty("--end-x", end.x + "px");
            elem.style.setProperty("--end-y", end.y + "px");
            addAnimateFunc("animate-teleport")();
        };
    }; // Prevent exhaustive-deps eslint rule from firing
    React.useEffect(addCallbacks, []);
    return (
        <div className="player" style={style}
            ref={ref}>
            {/* eslint-disable */}
            &#x1f642;
            {/* eslint-enable */}
            {level.pos.carry &&
                <span className="carry">
                    {level.pos.carry.render({
                        level,
                        className: level.pos.carry.className,
                        it: level.pos.carry,
                    })}
                </span>}
        </div>
    );
}

function Background({ topLeft, bottomRight, children }) {
    const level = React.useContext(Level);
    const a = calcCellPos(topLeft, level);
    const b = calcCellPos(bottomRight, level);
    const style = rectToStyle(a, b);
    return (
        <div style={style} className="background">
            {children}
        </div>
    );
}

function Obj(props) {
    const level = React.useContext(Level);
    const cell = calcCellPos(props.pos, level);
    const style = cellPosToStyle(cell);
    const type = props.pos.type;
    return (
        <div className={type.className} style={style}>
            {type.render && type.render({level: level, it: props.pos.type})}
        </div>
    );
}

const Level = React.createContext();

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
    const axx = a.hasOwnProperty('xx') ? a.xx : a.x;
    const ayy = a.hasOwnProperty('yy') ? a.yy : a.y;
    const bxx = b.hasOwnProperty('xx') ? b.xx : b.x;
    const byy = b.hasOwnProperty('yy') ? b.yy : b.y;
    return !(axx < b.x || bxx < a.x || ayy < b.y || byy < a.y);
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

function withCooldown(BaseComponent) {
    return function WithCooldown(props) {
        const [active, setActive] = React.useState(false);
        React.useEffect(() => {
            const t = setTimeout(() => setActive(true), inputCooldownMs);
            return () => clearTimeout(t);
        }, []);
        return <BaseComponent active={active} {...props}/>;
    };
}

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

export function Triangle({ color, className="", angle=0, d }) {
    const style = {
        margin: "auto",
    };
    const r = 100;
    const points = [];
    for (let i = 0; i < 3; i++) {
        const a = 2 * Math.PI * i / 3 + angle / 180 * Math.PI;
        const x = r * Math.cos(a);
        const y = r * Math.sin(a);
        points.push(Math.round(x), Math.round(y));
    }
    const viewbox = [-r, -r, 2 * r, 2 * r].join(" ");
    return (
        <svg width={d} height={d} viewBox={viewbox} style={style}
            className={className}>
            <polygon points={points.join(" ")} fill={color}/>
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
        shape: Square,
        render: (props) => {
            const d = props.level.d * 2/3;
            const Shape = props.it.shape;
            return <Shape d={d}/>;
        },
        interact: carryItem,
    },
    numpadLock: {
        className: "numpad-lock",
        render: () => <>&#x1f4f1;</>,
        interact: (level, next, index) => {
            const o = level.objects[index];
            const DelayedNumpad = withCooldown(Numpad);
            level.popover = function NumpadLockPopover() {
                const dismiss = () => {
                    level.setLevel(prev => ({...prev, popover: null}));
                };
                const onValidate = n => {
                    if (n.toString() === o.type.n.toString()) {
                        level.objects.splice(index, 1);
                        level.pos.animateEat();
                        const state = {...level, ...next};
                        state.popover = null;
                        level.setLevel(state);
                        return true;
                    } else {
                        console.log(`Expected: ${o.type.n}, entered: ${n}`);
                        return false;
                    }
                };
                return (
                    <div className="popover" onTouchStart={e => e.stopPropagation()}>
                        <DelayedNumpad onValidate={onValidate} onCancel={dismiss}/>
                    </div>
                );
            };
            return {};
        },
    },
    door: {
        className: "door",
        render: () => <>&#x1f6aa;</>,
        interact: (level, next, index) => {
            const o = level.objects[index];
            next.pos = {...next.pos, x: o.type.exit.x, y: o.type.exit.y};
            const curRect = calcCellPos(level.pos, level);
            const inRect = calcCellPos(o, level);
            const outRect = calcCellPos(o.type.out, level);
            const endRect = calcCellPos(o.type.exit, level);
            level.pos.animateTeleport(curRect, inRect, outRect, endRect);
            return next;
        },
    },
    npc: {
        className: "npc",
        who: () => <>&#x1f468;&#x1f3fb;</>,
        advisor: () => <>&#x1f469;&#x1f3fb;</>,
        render: ({ it }) => <>{it.who()}</>,
        interact: (level, next, index) => {
            const o = level.objects[index];
            if (level.pos.carry && level.pos.carry.what === o.type.wants) {
                level.objects.splice(index, 1);
                next.pos.carry = null;
                level.pos.animateEat();
                return next;
            }
            if (level.pos.carry) {
                console.info("npc.interact", level.pos.carry.what, o.type.wants);
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
                const dismiss = () => {
                    ready && level.setLevel(prev => ({...prev, popover: null}));
                };
                const Shape = o.type.shape;
                return (
                    <div className="popover" onTouchStart={e => e.stopPropagation()}>
                        <div className="speech">
                            <div className="who">
                                {o.type.who()}
                            </div>
                            <div className="what">
                                <Shape d={45}/>
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

function DuckPond() {
    const pond = React.useRef();
    const duck = React.useRef();
    const moveDuck = () => {
        const pondRect = pond.current.getBoundingClientRect();
        const duckRect = duck.current.getBoundingClientRect();
        const x = Math.floor(Math.random() * (pondRect.width - duckRect.width));
        const y = Math.floor(Math.random() * (pondRect.height - duckRect.height));
        duck.current.style.left = `${x}px`;
        duck.current.style.top = `${y}px`;
        const mirror = Math.random() < 0.5 ? -1 : 1;
        duck.current.style.transform = `scaleX(${mirror})`;
    };
    React.useLayoutEffect(moveDuck, []);
    React.useEffect(() => {
        let t;
        const delayMoveDuck = () => {
            t = setTimeout(() => {
                moveDuck();
                delayMoveDuck();
            }, 2000 + Math.random() * 8000);
        };
        delayMoveDuck();
        return () => clearTimeout(t);
    }, []);
    return (
        <div className="duckpond" ref={pond}>
            {/* eslint-disable-next-line */}
            <div className="duck" ref={duck}>&#x1f986;</div>
        </div>
    );
}

function addDuckPond(level, topLeft, bottomRight) {
    level.backgrounds.push(() => (
        <Background topLeft={topLeft} bottomRight={bottomRight}>
            <DuckPond/>
        </Background>
    ));
    level.objects.push({type: {...ObjType.wall, className: ""},
        x: topLeft.x, y: topLeft.y, xx: bottomRight.x, yy: bottomRight.y});
}

function addDoor(level, pos, out, exit) {
    addObjectsOfType(level, {...ObjType.door, out, exit}, pos);
}

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
function pickRandom(array) {
    const x = Math.floor(Math.random() * array.length);
    return array[x];
}

export const colors = [
    // darker colors
    "rgb(169,0,0)",
    "rgb(123,114,3)",
    "rgb(0,106,46)",
    "rgb(0,82,158)",
    "rgb(129,0,130)",
    // brighter colors
    "rgb(255,175,0)",
    "rgb(0,218,231)",
    "rgb(255,121,216)",
    "rgb(0,255,45)",
];

function Burger() {
    const m = 15;
    return (
        <svg width={30} height={30} viewBox="0 0 100 100">
            <g stroke="#aaa" stroke-width={8}>
                <line x1={m} y1={25} x2={100-m} y2={25}/>
                <line x1={m} y1={50} x2={100-m} y2={50}/>
                <line x1={m} y1={75} x2={100-m} y2={75}/>
            </g>
        </svg>
    );
}

function MapControls() {
    const level = React.useContext(Level);
    const choose = () => {
        level.setLevel(startLevel(levels.chooseLevel(level.setLevel)));
    };
    const restart = () => restartLevel(level);
    return (
        <div className="controls">
            <button onClick={choose}><Burger/></button>
            {level.name}
            <button onClick={restart}>&#8635;</button>
        </div>
    );
}

function Hint({ s }) {
    return <div className="hint">{`${s}`}</div>;
}

const counter = {
    current: 0,
}
function getNextCounter() {
    const value = counter.current;
    counter.current += 1;
    return value;
}

const baseLevel = {
    d: 45,
    width: 7, height: 7,
    score: 0,
    objects: [],
    backgrounds: [],
    walk: pos => prev => {
        prev.pos.stopAnimations();
        return {...prev, ...sanitizePlayerPos(pos, prev)}
    },
    render: ({ level }) => {
        return (
            <>
                <Map key={level._counter} onSetPlayerPos={level.walk}>
                    {level.backgrounds.map((Bg, i) => <Bg key={i}/>)}
                    {level.objects.map((pos, i) => <Obj key={i} pos={pos}/>)}
                    <Player/>
                    {level.popover && level.popover()}
                </Map>
                <MapControls/>
            </>
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
    "1": setLevel => ({
        ...baseLevel, name: "1", setLevel,
        pos: {x: 2, y: 3, carry: ObjType.key},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 4, y: 3}),
        ],
        nextLevel: winAndSetNextByTemplate(levels["2"], setLevel),
    }),
    "2": setLevel => ({
        ...baseLevel, name: "2", setLevel,
        pos: {x: 1, y: 1},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 5, y: 5}),
            $addObjectsOfType(ObjType.wall,
                {x: 4, y: 1}, {x: 5, y: 1}, {x: 5, y: 2},
                {x: 1, y: 4}, {x: 1, y: 5}, {x: 2, y: 5}),
        ],
        nextLevel: winAndSetNextByTemplate(levels["3"], setLevel),
    }),
    "3": setLevel => ({
        ...baseLevel, name: "3", setLevel,
        pos: {x: 1, y: 3},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 5, y: 3}),
            $addObjectsOfType(ObjType.wall, {x: 3, y: 2}, {x: 3, y: 3}, {x: 3, y: 4}),
        ],
        nextLevel: winAndSetNextByTemplate(levels["4"], setLevel),
    }),
    "4": setLevel => ({
        ...baseLevel, name: "4", setLevel,
        pos: {x: 2, y: 1},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 2, y: 5}),
            $addObjectsOfType(ObjType.wall,
                {x: 0, y: 3}, {x: 1, y: 3}, {x: 2, y: 3}, {x: 3, y: 3}, {x: 4, y: 3}),
        ],
        nextLevel: winAndSetNextByTemplate(levels["5"], setLevel),
    }),
    "5": setLevel => ({
        ...baseLevel, name: "5", setLevel,
        pos: {x: 3, y: 3},
        onLoad: [
            $addObjectsOfType(ObjType.target,
                {x: 1, y: 1}, {x: 1, y: 5}, {x: 5, y: 1}, {x: 5, y: 5}),
            $addObjectsOfType(ObjType.wall,
                {x: 1, y: 3}, {x: 3, y: 1}, {x: 5, y: 3}, {x: 3, y: 5},
                {x: 0, y: 3}, {x: 3, y: 0}, {x: 6, y: 3}, {x: 3, y: 6}),
        ],
        nextLevel: winAndSetNextByTemplate(levels["6"], setLevel),
    }),
    "6": setLevel => ({
        ...baseLevel, name: "6", setLevel,
        pos: {x: 1, y: 1},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 5, y: 1}),
            $addObjectsOfType(ObjType.wall,
                {x: 3, y: 0}, {x: 3, y: 1}, {x: 3, y: 2}, {x: 3, y: 3},
                {x: 1, y: 3}, {x: 1, y: 4}, {x: 1, y: 5},
                {x: 5, y: 3}, {x: 5, y: 4}, {x: 5, y: 5},
                {x: 2, y: 5}, {x: 3, y: 5}, {x: 4, y: 5}),
        ],
        nextLevel: winAndSetNextByTemplate(levels["7"], setLevel),
    }),
    "7": setLevel => ({
        ...baseLevel, name: "7", setLevel,
        pos: {x: 1, y: 3},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 5, y: 1}),
            $addObjectsOfType(ObjType.lock, {x: 3, y: 2}),
            $addObjectsOfType(ObjType.key, {x: 5, y: 5}),
            $addObjectsOfType(ObjType.wall,
                {x: 3, y: 0}, {x: 3, y: 1}, {x: 3, y: 3}, {x: 4, y: 3},
                {x: 5, y: 3}, {x: 6, y: 3}),
        ],
        nextLevel: winAndSetNextByTemplate(levels["8"], setLevel),
    }),
    "8": setLevel => ({
        ...baseLevel, name: "8", setLevel,
        pos: {x: 3, y: 1},
        onLoad: level => {
            const add = (...args) => addObjectsOfType(level, ...args);
            add(ObjType.target, {x: 3, y: 5});
            const [a, b] = chooseN(colors, 2);
            const c = Math.random() < .5 ? a : b;
            const figure = c => ({ d }) => <Square color={c} d={d}/>;
            const shape = c => ({...ObjType.figure, what: c, shape: figure(c)});
            add(shape(a), {x: 1, y: 1});
            add(shape(b), {x: 5, y: 1});
            add({...ObjType.npc, shape: figure(c), wants: c}, {x: 3, y: 3});
            add(ObjType.wall,
                {x: 0, y: 3}, {x: 1, y: 3}, {x: 2, y: 3},
                {x: 4, y: 3}, {x: 5, y: 3}, {x: 6, y: 3});
        },
        nextLevel: winAndSetNextByTemplate(levels["9"], setLevel),
    }),
    "9": setLevel => ({
        ...baseLevel, name: "9", setLevel,
        pos: {x: 1, y: 1},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 5, y: 1}),
            $addObjectsOfType(ObjType.key, {x: 5, y: 5}),
            $addObjectsOfType(ObjType.lock,
                {x: 3, y: 0}, {x: 3, y: 1}, {x: 3, y: 2},
                {x: 4, y: 3}, {x: 5, y: 3}, {x: 6, y: 3}),
            $addObjectsOfType(ObjType.wall, {x: 3, y: 3}),
        ],
        nextLevel: winAndSetNextByTemplate(levels["10"], setLevel),
    }),
    "10": setLevel => ({
        ...baseLevel, name: "10", setLevel,
        pos: {x: 2, y: 3},
        onLoad: level => {
            const add = (...args) => addObjectsOfType(level, ...args);
            add(ObjType.target, {x: 6, y: 0}, {x: 6, y: 3}, {x: 6, y: 6});
            add(ObjType.lock, {x: 4, y: 3});
            add(ObjType.wall,
                {x: 0, y: 0}, {x: 0, y: 2}, {x: 0, y: 4}, {x: 0, y: 6},
                {x: 4, y: 0}, {x: 4, y: 6},
                {x: 4, y: 2}, {x: 5, y: 2}, {x: 6, y: 2},
                {x: 4, y: 4}, {x: 5, y: 4}, {x: 6, y: 4},
            );
            add(ObjType.key, {x: 0, y: 1});
            const cc = chooseN(colors, 2);
            const render = c => ({ d }) => <Square color={c} d={d}/>;
            const figure = c => ({...ObjType.figure, what: c, shape: render(c)});
            const npc = c => ({...ObjType.npc, wants: c, shape: render(c)});
            add(npc(cc[0]), {x: 4, y: 1});
            add(npc(cc[1]), {x: 4, y: 5});
            shuffle(cc);
            add(figure(cc[0]), {x: 0, y: 3});
            add(figure(cc[1]), {x: 0, y: 5});
        },
        nextLevel: winAndSetNextByTemplate(levels["11"], setLevel),
    }),
    "11": setLevel => ({
        ...baseLevel, name: "11", setLevel,
        pos: {x: 1, y: 2},
        onLoad: level => {
            const add = (...args) => addObjectsOfType(level, ...args);
            const cc = chooseN(colors, 4);
            const c = pickRandom(cc);
            const render = c => ({ d }) => <Square color={c} d={d}/>;
            const figure = c => ({...ObjType.figure, what: c, shape: render(c)});
            const npc = c => ({...ObjType.npc, wants: c, shape: render(c)});
            add(ObjType.target, {x: 5, y: 6});
            add(ObjType.lock, {x: 5, y: 4});
            add(npc(c), {x: 1, y: 4});
            add(ObjType.wall,
                {x: 1, y: 0}, {x: 3, y: 0}, {x: 5, y: 0},
                {x: 0, y: 4}, {x: 2, y: 4}, {x: 3, y: 4}, {x: 4, y: 4}, {x: 6, y: 4},
                {x: 3, y: 5}, {x: 3, y: 6},
            );
            add(ObjType.key, {x: 1, y: 6});
            add(figure(cc[0]), {x: 0, y: 0});
            add(figure(cc[1]), {x: 2, y: 0});
            add(figure(cc[2]), {x: 4, y: 0});
            add(figure(cc[3]), {x: 6, y: 0});
        },
        nextLevel: winAndSetNextByTemplate(levels["12"], setLevel),
    }),
    "12": setLevel => ({
        ...baseLevel, name: "12", setLevel,
        pos: {x: 5, y: 5},
        onLoad: level => {
            const add = (...args) => addObjectsOfType(level, ...args);
            add(ObjType.target, {x: 0, y: 6});
            add(ObjType.wall,
                {x: 0, y: 4}, {x: 1, y: 4}, {x: 2, y: 4}, {x: 2, y: 6},
            );
            const aa = chooseN([0, 90, 180, 270], 3);
            const c = pickRandom(colors);
            const a = pickRandom(aa);
            const pos = [{x:1, y:1}, {x:3, y:1}, {x:5, y:1}];
            for (let i = 0; i < pos.length; i++) {
                const shape = ({ d }) => <Triangle angle={aa[i]} color={c} d={d}/>;
                add({...ObjType.figure, what: aa[i], shape}, pos[i]);
                if (aa[i] === a) {
                    add({...ObjType.npc, wants: a, shape}, {x:2, y:5});
                }
            }
        },
        nextLevel: winAndSetNextByTemplate(levels["13"], setLevel),
    }),
    "13": setLevel => ({
        ...baseLevel, name: "13", setLevel,
        pos: {x: 3, y: 2},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 3, y: 6}),
            $addObjectsOfType(ObjType.wall,
                {x: 2, y: 4}, {x: 2, y: 5}, {x: 2, y: 6},
                {x: 4, y: 4}, {x: 4, y: 5}, {x: 4, y: 6},
                {x: 0, y: 0}, {x: 0, y: 2}, {x: 0, y: 4}, {x: 0, y: 6},
                {x: 6, y: 0}, {x: 6, y: 2}, {x: 6, y: 4}, {x: 6, y: 6},
                {x: 2, y: 0}, {x: 4, y: 0},
                {x: 1, y: 6}, {x: 5, y: 6},
            ),
            level => {
                shuffle(colors);
                const coords = [
                    {x: 1, y: 0}, {x: 3, y: 0}, {x: 5, y: 0},
                    {x: 0, y: 1}, {x: 0, y: 3}, {x: 0, y: 5},
                    {x: 6, y: 1}, {x: 6, y: 3}, {x: 6, y: 5},
                ];
                console.assert(colors.length === coords.length);
                const render = c => ({ d }) => <Square color={c} d={d}/>;
                const figure = c => ({...ObjType.figure, what: c, shape: render(c)});
                const npc = c => ({...ObjType.npc, wants: c, shape: render(c)});
                for (let i = 0; i < coords.length; i++) {
                    level.objects.push({ ...coords[i], type: figure(colors[i])});
                }
                const c = pickRandom(colors);
                level.objects.push({ x: 3, y: 4, type: npc(c)});
            },
        ],
        nextLevel: winAndSetNextByTemplate(levels["14"], setLevel),
    }),
    "14": setLevel => ({
        ...baseLevel, name: "14", setLevel,
        pos: {x: 6, y: 1},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 3, y: 0}, {x: 5, y: 5}),
            $addObjectsOfType(ObjType.key, {x: 1, y: 0}),
            $addObjectsOfType(ObjType.lock, {x: 0, y: 4}),
            $addObjectsOfType(ObjType.wall,
                {x: 3, y: 4}, {x: 2, y: 5}, {x: 3, y: 6},
                {x: 5, y: 3},
            ),
            level => {
                addDuckPond(level, {x:1, y:1}, {x:4, y:3});
                const cc = chooseN(colors, 2);
                const c = pickRandom(cc);
                const add = (...args) => addObjectsOfType(level, ...args);
                const render = c => ({ d }) => <Square color={c} d={d}/>;
                const figure = c => ({...ObjType.figure, what: c, shape: render(c)});
                const npc = c => ({...ObjType.npc, wants: c, shape: render(c)});
                add(figure(cc[0]), {x: 2, y: 4});
                add(figure(cc[1]), {x: 2, y: 6});
                add(npc(c), {x: 6, y: 3});
            },
        ],
        nextLevel: winAndSetNextByTemplate(levels["15"], setLevel),
    }),
    "15": setLevel => ({
        ...baseLevel, name: "15", setLevel,
        height: 8,
        pos: {x: 3, y: 2},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 0, y: 7}),
            $addObjectsOfType(ObjType.key, {x: 6, y: 7}),
            $addObjectsOfType(ObjType.lock, {x: 0, y: 4}, {x: 1, y: 4}),
            $addObjectsOfType(ObjType.wall, {x: 3, y: 5}, {x: 5, y: 4}),
            level => {
                addDuckPond(level, {x:2, y:0}, {x:4, y:1});
                addDuckPond(level, {x:2, y:3}, {x:4, y:4});
                addDuckPond(level, {x:2, y:6}, {x:4, y:7});
                const cc = chooseN(colors, 3);
                const c = pickRandom(cc);
                const add = (...args) => addObjectsOfType(level, ...args);
                const render = c => ({ d }) => <Square color={c} d={d}/>;
                const figure = c => ({...ObjType.figure, what: c, shape: render(c)});
                const npc = c => ({...ObjType.npc, wants: c, shape: render(c)});
                add(figure(cc[0]), {x: 0, y: 0});
                add(figure(cc[1]), {x: 6, y: 0});
                add(figure(cc[2]), {x: 0, y: 3});
                add(npc(c), {x: 6, y: 4});
            },
        ],
        nextLevel: winAndSetNextByTemplate(levels["16"], setLevel),
    }),
    "16": setLevel => ({
        ...baseLevel, name: "16", setLevel,
        pos: {x: 3, y: 3},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 3, y: 6}),
            level => {
                addDuckPond(level, {x:0, y:0}, {x:1, y:2});
                addDuckPond(level, {x:5, y:0}, {x:6, y:2});
                addDuckPond(level, {x:0, y:5}, {x:2, y:6});
                addDuckPond(level, {x:4, y:5}, {x:6, y:6});
                const aa = chooseN([0, 90, 180, 270], 4);
                const a = pickRandom(aa);
                const c = pickRandom(colors);
                const add = (...args) => addObjectsOfType(level, ...args);
                const render = a => ({ d }) => <Triangle angle={a} color={c} d={d}/>;
                const figure = a => ({...ObjType.figure, what: a, shape: render(a)});
                const npc = a => ({...ObjType.npc, wants: a, shape: render(a)});
                add(figure(aa[0]), {x: 0, y: 4});
                add(figure(aa[1]), {x: 6, y: 4});
                add(figure(aa[2]), {x: 2, y: 0});
                add(figure(aa[3]), {x: 4, y: 0});
                add(npc(a), {x: 3, y: 5});
            },
        ],
        nextLevel: winAndSetNextByTemplate(levels["17"], setLevel),
    }),
    "17": setLevel => ({
        ...baseLevel, name: "17", setLevel,
        pos: {x: 3, y: 3},
        onLoad: [
            $addObjectsOfType(ObjType.target,
                {x: 4, y: 0}, {x: 0, y: 2}, {x: 6, y: 4}, {x: 2, y: 6},
            ),
            level => {
                addDuckPond(level, {x:0, y:0}, {x:3, y:1});
                addDuckPond(level, {x:5, y:0}, {x:6, y:3});
                addDuckPond(level, {x:0, y:3}, {x:1, y:6});
                addDuckPond(level, {x:3, y:5}, {x:6, y:6});
                const cc = chooseN(colors, 4);
                const add = (...args) => addObjectsOfType(level, ...args);
                const render = c => ({ d }) => <Square color={c} d={d}/>;
                const figure = c => ({...ObjType.figure, what: c, shape: render(c)});
                add(figure(cc[0]), {x: 4, y: 1});
                add(figure(cc[1]), {x: 1, y: 2});
                add(figure(cc[2]), {x: 5, y: 4});
                add(figure(cc[3]), {x: 2, y: 5});
            },
        ],
        nextLevel: winAndSetNextByTemplate(levels["18"], setLevel),
    }),
    "18": setLevel => ({
        ...baseLevel, name: "18", setLevel,
        pos: {x: 3, y: 3},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 3, y: 0}),
            level => {
                addDuckPond(level, {x:0, y:0}, {x:2, y:1});
                addDuckPond(level, {x:4, y:0}, {x:6, y:1});
                addDuckPond(level, {x:0, y:5}, {x:2, y:6});
                addDuckPond(level, {x:4, y:5}, {x:6, y:6});
                const cc = chooseN(colors, 3);
                const add = (...args) => addObjectsOfType(level, ...args);
                const render = c => ({ d }) => <Square color={c} d={d}/>;
                const figure = c => ({...ObjType.figure, what: c, shape: render(c)});
                const npc = c => ({...ObjType.npc, wants: c, shape: render(c)});
                add(figure(cc[0]), {x: 3, y: 6});
                add(figure(cc[1]), {x: 1, y: 3});
                add(figure(cc[2]), {x: 5, y: 3});
                add(npc(cc[0]), {x: 3, y: 1});
                const i = Math.random() < 0.5 ? 1 : 2;
                add(npc(cc[i]), {x: 3, y: 5});
            },
        ],
        nextLevel: winAndSetNextByTemplate(levels["19"], setLevel),
    }),
    "19": setLevel => ({
        ...baseLevel, name: "19", setLevel,
        pos: {x: 3, y: 2},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 3, y: 6}),
            $addObjectsOfType(ObjType.wall,
                {x: 0, y: 4}, {x: 2, y: 4}, {x: 4, y: 4}, {x: 6, y: 4},
            ),
            level => {
                addDuckPond(level, {x:0, y:0}, {x:1, y:1});
                addDuckPond(level, {x:5, y:0}, {x:6, y:1});
                const cc = chooseN(colors, 3);
                const c = pickRandom(cc);
                const add = (...args) => addObjectsOfType(level, ...args);
                const render = c => ({ d }) => <Square color={c} d={d}/>;
                const figure = c => ({...ObjType.figure, what: c, shape: render(c)});
                const npc = c => ({...ObjType.npc, wants: c, shape: render(c)});
                add(figure(c), {x: 3, y: 0});
                add(npc(cc[0]), {x: 1, y: 4});
                add(npc(cc[1]), {x: 3, y: 4});
                add(npc(cc[2]), {x: 5, y: 4});
            },
        ],
        nextLevel: winAndSetNextByTemplate(levels["20"], setLevel),
    }),
    "20": setLevel => ({
        ...baseLevel, name: "20", setLevel,
        pos: {x: 5, y: 3},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 1, y: 3}),
            $addObjectsOfType(ObjType.wall,
                {x: 3, y: 0}, {x: 3, y: 2}, {x: 3, y: 4}, {x: 3, y: 6},
            ),
            level => {
                addDoor(level, {x: 5, y: 6}, {x: 1, y: 0}, {x: 1, y: 1});
                addDoor(level, {x: 1, y: 0}, {x: 5, y: 6}, {x: 5, y: 5});
                const cc = chooseN(colors, 3);
                const c = pickRandom(cc);
                const add = (...args) => addObjectsOfType(level, ...args);
                const render = c => ({ d }) => <Square color={c} d={d}/>;
                const figure = c => ({...ObjType.figure, what: c, shape: render(c)});
                const npc = c => ({...ObjType.npc, wants: c, shape: render(c)});
                add(figure(c), {x: 1, y: 5});
                add(npc(cc[0]), {x: 3, y: 1});
                add(npc(cc[1]), {x: 3, y: 3});
                add(npc(cc[2]), {x: 3, y: 5});
            },
        ],
        nextLevel: winAndSetNextByTemplate(levels["21"], setLevel),
    }),
    "21": setLevel => ({
        ...baseLevel, name: "21", setLevel,
        pos: {x: 0, y: 6},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 6, y: 6}, {x: 0, y: 0}),
            $addObjectsOfType(ObjType.wall,
                {x: 1, y: 3}, {x: 3, y: 1}, {x: 3, y: 5}, {x: 5, y: 3},
            ),
            level => {
                addDuckPond(level, {x:2, y:2}, {x:4, y:4});
                addDoor(level, {x: 0, y: 3}, {x: 3, y: 6}, {x: 4, y: 6});
                addDoor(level, {x: 3, y: 6}, {x: 0, y: 3}, {x: 0, y: 4});
                addDoor(level, {x: 6, y: 3}, {x: 3, y: 0}, {x: 4, y: 0});
                addDoor(level, {x: 3, y: 0}, {x: 0, y: 3}, {x: 0, y: 2});
            },
        ],
        nextLevel: winAndSetNextByTemplate(levels["22"], setLevel),
    }),
    "22": setLevel => ({
        ...baseLevel, name: "22", setLevel,
        height: 8,
        pos: {x: 3, y: 3},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 0, y: 0}),
            $addObjectsOfType(ObjType.wall,
                {x: 1, y: 0}, {x: 3, y: 0}, {x: 3, y: 7},
            ),
            $addObjectsOfType(ObjType.key,
                {x: 2, y: 0}, {x: 6, y: 4}, {x: 0, y: 6},
            ),
            $addObjectsOfType(ObjType.lock, {x: 3, y: 1}, {x: 3, y: 6}),
            level => {
                addDuckPond(level, {x:0, y:2}, {x:6, y:2});
                addDuckPond(level, {x:0, y:5}, {x:6, y:5});
                addDoor(level, {x: 0, y: 3}, {x: 6, y: 0}, {x: 5, y: 0});
                addDoor(level, {x: 6, y: 0}, {x: 0, y: 3}, {x: 1, y: 3});
                addDoor(level, {x: 0, y: 4}, {x: 6, y: 7}, {x: 5, y: 7});
                addDoor(level, {x: 6, y: 7}, {x: 0, y: 4}, {x: 1, y: 4});
                const c = pickRandom(colors);
                const add = (...args) => addObjectsOfType(level, ...args);
                const render = c => ({ d }) => <Square color={c} d={d}/>;
                const figure = c => ({...ObjType.figure, what: c, shape: render(c)});
                const npc = c => ({...ObjType.npc, wants: c, shape: render(c)});
                add(figure(c), {x: 0, y: 7});
                add(npc(c), {x: 1, y: 1});
            },
        ],
        nextLevel: winAndSetNextByTemplate(levels["23"], setLevel),
    }),
    "23": setLevel => ({
        ...baseLevel, name: "23", setLevel,
        pos: {x: 1, y: 4},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 3, y: 2}),
            $addObjectsOfType(ObjType.wall,
                {x: 0, y: 2}, {x: 2, y: 2}, {x: 2, y: 3},
                {x: 3, y: 0}, {x: 3, y: 1},
                {x: 6, y: 2}, {x: 4, y: 2}, {x: 4, y: 3},
            ),
            level => {
                addDuckPond(level, {x:1, y:6}, {x:5, y:6});
                const add = (...args) => addObjectsOfType(level, ...args);
                const render = c => ({ d }) => <Square color={c} d={d}/>;
                const figure = c => ({...ObjType.figure, what: c, shape: render(c)});
                const npc = c => ({...ObjType.npc, wants: c, shape: render(c)});
                const cc = chooseN(colors, 8);
                const c1 = pickRandom([cc[0], cc[1]]);
                add(npc(c1), {x: 1, y: 2});
                add(figure(cc[0]), {x: 0, y: 6});
                add(figure(cc[1]), {x: 6, y: 6});
                const c2 = pickRandom([cc[2], cc[3], cc[4]]);
                add(npc(c2), {x: 5, y: 2});
                add(figure(cc[2]), {x: 0, y: 1});
                add(figure(cc[3]), {x: 1, y: 0});
                add(figure(cc[4]), {x: 2, y: 1});
                const c3 = pickRandom([cc[5], cc[6], cc[7]]);
                add(npc(c3), {x: 3, y: 3});
                add(figure(cc[5]), {x: 4, y: 1});
                add(figure(cc[6]), {x: 5, y: 0});
                add(figure(cc[7]), {x: 6, y: 1});
            },
        ],
        nextLevel: winAndSetNextByTemplate(levels["24"], setLevel),
    }),
    "24": setLevel => ({
        ...baseLevel, name: "24", setLevel,
        pos: {x: 1, y: 2},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 6, y: 2}),
            $addObjectsOfType(ObjType.key, {x: 6, y: 0}),
            $addObjectsOfType(ObjType.lock, {x: 3, y: 6}),
            $addObjectsOfType(ObjType.wall, {x: 0, y: 4}, {x: 6, y: 1}),
            level => {
                addDuckPond(level, {x:1, y:4}, {x:2, y:5});
                addDuckPond(level, {x:4, y:4}, {x:5, y:5});
                addDuckPond(level, {x:4, y:1}, {x:5, y:2});
                const add = (...args) => addObjectsOfType(level, ...args);
                const render = c => ({ d }) => <Square color={c} d={d}/>;
                const figure = c => ({...ObjType.figure, what: c, shape: render(c)});
                const npc = c => ({...ObjType.npc, wants: c, shape: render(c)});
                const cc = chooseN(colors, 2);
                add(npc(cc[0]), {x: 6, y: 3});
                add(figure(cc[0]), {x: 0, y: 5});
                add(figure(cc[1]), {x: 1, y: 6});
            },
        ],
        nextLevel: winAndSetNextByTemplate(levels["25"], setLevel),
    }),
    "25": setLevel => ({
        ...baseLevel, name: "25", setLevel,
        pos: {x: 3, y: 3},
        onLoad: [
            $addObjectsOfType(ObjType.target,
                {x: 0, y: 0}, {x: 0, y: 3}, {x: 0, y: 6},
            ),
            level => {
                addDuckPond(level, {x:0, y:1}, {x:1, y:2});
                addDuckPond(level, {x:0, y:4}, {x:1, y:5});
                const add = (...args) => addObjectsOfType(level, ...args);
                const render = c => ({ d }) => <Square color={c} d={d}/>;
                const figure = c => ({...ObjType.figure, what: c, shape: render(c)});
                const npc = c => ({...ObjType.npc, wants: c, shape: render(c)});
                {
                    const cc = shuffle(colors);
                    [   {x: 6, y: 0}, {x: 5, y: 0}, {x: 5, y: 1},
                        {x: 5, y: 2}, {x: 5, y: 3}, {x: 5, y: 4},
                        {x: 5, y: 5}, {x: 5, y: 6}, {x: 6, y: 6},
                    ].forEach((pos, i) => {
                        add(figure(cc[i]), pos);
                    });
                }
                {
                    const cc = chooseN(colors, 5);
                    const [c1, c2, c3] = chooseN(cc, 3);
                    add(npc(c1), {x: 1, y: 0});
                    add(npc(c2), {x: 1, y: 3});
                    add(npc(c3), {x: 1, y: 6});
                    [   {x: 6, y: 1}, {x: 6, y: 2}, {x: 6, y: 3},
                        {x: 6, y: 4}, {x: 6, y: 5},
                    ].forEach((pos, i) => {
                        add(figure(cc[i]), pos);
                    });
                }
            },
        ],
        nextLevel: winAndSetNextByTemplate(levels["26"], setLevel),
    }),
    "26": setLevel => ({
        ...baseLevel, name: "26", setLevel,
        pos: {x: 5, y: 3},
        onLoad: [
            $addObjectsOfType(ObjType.target,
                {x: 0, y: 0}, {x: 0, y: 1},
                {x: 0, y: 5}, {x: 0, y: 6},
                {x: 5, y: 0}, {x: 5, y: 6},
            ),
            $addObjectsOfType(ObjType.wall, {x: 1, y: 0}, {x: 1, y: 6}),
            level => {
                addDuckPond(level, {x:3, y:0}, {x:4, y:2});
                addDuckPond(level, {x:3, y:4}, {x:4, y:6});
                addDuckPond(level, {x:0, y:2}, {x:2, y:4});
                addDoor(level, {x: 3, y: 3}, {x: 2, y: 0}, {x: 2, y: 1});
                addDoor(level, {x: 2, y: 0}, {x: 2, y: 6}, {x: 2, y: 5});
                addDoor(level, {x: 2, y: 6}, {x: 3, y: 3}, {x: 4, y: 3});
                const add = (...args) => addObjectsOfType(level, ...args);
                const render = c => ({ d }) => <Square color={c} d={d}/>;
                const figure = c => ({...ObjType.figure, what: c, shape: render(c)});
                const npc = c => ({...ObjType.npc, wants: c, shape: render(c)});
                const cc = chooseN(colors, 5);
                const [c1, c2] = chooseN(cc, 2);
                [   {x: 6, y: 1}, {x: 6, y: 2}, {x: 6, y: 3},
                    {x: 6, y: 4}, {x: 6, y: 5},
                ].forEach((pos, i) => {
                    add(figure(cc[i]), pos);
                });
                add(npc(c1), {x: 1, y: 1});
                add(npc(c2), {x: 1, y: 5});
            },
        ],
        nextLevel: winAndSetNextByTemplate(levels["27"], setLevel),
    }),
    "27": setLevel => ({
        ...baseLevel, name: "27", setLevel,
        pos: {x: 3, y: 3},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 3, y: 0}, {x: 3, y: 6}),
            level => {
                addDuckPond(level, {x:0, y:0}, {x:0, y:6});
                addDuckPond(level, {x:6, y:0}, {x:6, y:6});
                const add = (...args) => addObjectsOfType(level, ...args);
                const render = c => ({ d }) => <Square color={c} d={d}/>;
                const figure = c => ({...ObjType.figure, what: c, shape: render(c)});
                const npc = c => ({...ObjType.npc, wants: c, shape: render(c)});
                [{npcY: 1, figureX: 1}, {npcY: 5, figureX: 5}].forEach(p => {
                    const cc = chooseN(colors, 5);
                    [1, 2, 3, 4, 5].forEach((x, i) => {
                        add(npc(cc[i]), {x, y: p.npcY});
                    });
                    const c = pickRandom(cc);
                    add(figure(c), {x: p.figureX, y: 3});
                });
            },
        ],
        nextLevel: winAndSetNextByTemplate(levels["28"], setLevel),
    }),
    "28": setLevel => ({
        ...baseLevel, name: "28", setLevel,
        pos: {x: 1, y: 3},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 6, y: 3}, {x: 6, y: 6}),
            $addObjectsOfType(ObjType.key, {x: 6, y: 0}),
            $addObjectsOfType(ObjType.lock, {x: 3, y: 3}),
            level => {
                addDuckPond(level, {x:3, y:1}, {x:6, y:2});
                addDuckPond(level, {x:3, y:4}, {x:6, y:5});
                const add = (...args) => addObjectsOfType(level, ...args);
                const render = c => ({ d }) => <Square color={c} d={d}/>;
                const figure = c => ({...ObjType.figure, what: c, shape: render(c)});
                const npc = c => ({...ObjType.npc, wants: c, shape: render(c)});
                const cc = chooseN(colors, 3);
                add(figure(cc[0]), {x: 3, y: 6});
                add(npc(cc[0]), {x: 3, y: 0});
                add(figure(cc[1]), {x: 4, y: 0});
                add(npc(cc[1]), {x: 4, y: 6});
                add(figure(cc[2]), {x: 5, y: 6});
                add(npc(cc[2]), {x: 5, y: 0});
            },
        ],
        nextLevel: winAndSetNextByTemplate(levels["29"], setLevel),
    }),
    "29": setLevel => ({
        ...baseLevel, name: "29", setLevel,
        pos: {x: 1, y: 3},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 5, y: 1}),
            $addObjectsOfType(ObjType.wall,
                {x: 3, y: 0}, {x: 3, y: 1}, {x: 3, y: 3}, {x: 4, y: 3},
                {x: 5, y: 3}, {x: 6, y: 3}),
            level => {
                const add = (...args) => addObjectsOfType(level, ...args);
                const numpad = n => ({...ObjType.numpadLock, n});
                const advisor = n => ({...ObjType.npc, who: ObjType.npc.advisor,
                    shape: () => <Hint s={n}/>});
                const n = pickRandom([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
                add(advisor(n), {x: 5, y: 5});
                add(numpad(n), {x: 3, y: 2});
            },
        ],
        nextLevel: winAndSetNextByTemplate(levels["30"], setLevel),
    }),
    "30": setLevel => ({
        ...baseLevel, name: "30", setLevel,
        pos: {x: 3, y: 1},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 1, y: 6}, {x: 5, y: 6}),
            $addObjectsOfType(ObjType.wall, {x: 1, y: 3}, {x: 5, y: 3}),
            level => {
                addDuckPond(level, {x: 3, y: 3}, {x: 3, y: 6});
                const add = (...args) => addObjectsOfType(level, ...args);
                const numpad = n => ({...ObjType.numpadLock, n});
                const advisor = n => ({...ObjType.npc, who: ObjType.npc.advisor,
                    shape: () => <Hint s={n}/>});
                const nn = chooseN([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 2);
                [{advisorX: 0, numpadX: 2}, {advisorX: 6, numpadX: 4}].forEach((p, i) => {
                    add(advisor(nn[i]), {x: p.advisorX, y: 3});
                    add(numpad(nn[i]), {x: p.numpadX, y: 3});
                });
            },
        ],
        nextLevel: winAndSetNextByTemplate(levels["31"], setLevel),
    }),
    "31": setLevel => ({
        ...baseLevel, name: "31", setLevel,
        pos: {x: 3, y: 4},
        onLoad: [
            $addObjectsOfType(ObjType.target,
                {x: 0, y: 0}, {x: 3, y: 0}, {x: 6, y: 0},
            ),
            level => {
                addDuckPond(level, {x: 1, y: 0}, {x: 2, y: 2});
                addDuckPond(level, {x: 4, y: 0}, {x: 5, y: 2});
                const add = (...args) => addObjectsOfType(level, ...args);
                const numpad = n => ({...ObjType.numpadLock, n});
                const advisor = n => ({...ObjType.npc, who: ObjType.npc.advisor,
                    shape: () => <Hint s={n}/>});
                const n = pickRandom([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
                add(advisor(n), {x: 3, y: 6});
                add(numpad(n), {x: 3, y: 2});
                const render = c => ({ d }) => <Square color={c} d={d}/>;
                const figure = c => ({...ObjType.figure, what: c, shape: render(c)});
                const npc = c => ({...ObjType.npc, wants: c, shape: render(c)});
                const cc = chooseN(colors, 8);
                const [c1, c2] = chooseN(cc, 2);
                add(npc(c1), {x: 0, y: 2});
                add(npc(c2), {x: 6, y: 2});
                [   {x: 0, y: 5}, {x: 0, y: 6}, {x: 1, y: 5},
                    {x: 1, y: 6}, {x: 5, y: 5}, {x: 5, y: 6},
                    {x: 6, y: 5}, {x: 6, y: 6} ].forEach((pos, i) => {
                    add(figure(cc[i]), pos);
                });
            },
        ],
        nextLevel: winAndSetNextByTemplate(levels["32"], setLevel),
    }),
    "32": setLevel => ({
        ...baseLevel, name: "32", setLevel,
        pos: {x: 5, y: 1},
        onLoad: [
            $addObjectsOfType(ObjType.target,
                {x: 0, y: 4}, {x: 2, y: 5}, {x: 4, y: 6},
            ),
            level => {
                addDuckPond(level, {x: 1, y: 3}, {x: 1, y: 6});
                addDuckPond(level, {x: 3, y: 5}, {x: 3, y: 6});
                const add = (...args) => addObjectsOfType(level, ...args);
                const numpad = n => ({...ObjType.numpadLock, n});
                const advisor = n => ({...ObjType.npc, who: ObjType.npc.advisor,
                    shape: () => <Hint s={n}/>});
                const [n1, n2, n3] = chooseN([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
                add(advisor(n1), {x: 1, y: 2});
                add(numpad(n1), {x: 0, y: 1});
                add(advisor(n2), {x: 3, y: 4});
                add(numpad(n2), {x: 2, y: 3});
                add(advisor(n3), {x: 5, y: 6});
                add(numpad(n3), {x: 4, y: 5});
            },
        ],
        nextLevel: winAndSetNextByTemplate(levels.chooseLevel, setLevel),
    }),
    win: next => setLevel => ({
        ...baseLevel, setLevel,
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
                        className="next"><Triangle angle={0} color={"white"} d={30}/></button>}
                    {state.list && <button onClick={listLevels}
                        className="list"></button>}
                </div>
            );
        },
    }),
    chooseLevel: setLevel => ({
        ...baseLevel, setLevel,
        render: ({ level }) => {
            const onChoose = level => setLevel(startLevel(levels[level](setLevel)));
            return (
                <div className="choose-level" style={computeLevelStyle(level)}>
                    <ChooseLevels onChoose={onChoose} levels={Object.keys(levels)}/>
                </div>
            );
        },
    }),
};

function computeLevelStyle(level) {
    const width = level.width * level.d;
    const height = level.height * level.d;
    const style = {
        width: `${width}px`, height: `${height}px`,
        tabIndex: 0,
    };
    return style;
}

const ChooseLevels = withRouter(({ onChoose, levels, location }) => {
    const current = getLevelNameFromRouter(location);
    const ref = React.useRef(null);
    React.useLayoutEffect(() => {
        if (ref.current !== null) {
            ref.current.scrollIntoView({block: "center"});
        }
    }, []);
    return (
        <div className="level-list">
            {levels.map((level, i) => {
                if (isNaN(level)) {
                    return null;
                }
                const props = {};
                if (current === level) {
                    props.className = "current";
                    props.ref = ref;
                }
                return (
                    <button key={level} onClick={() => onChoose(level)} {...props}>
                        {level}
                    </button>
                );
            })}
        </div>
    );
});

function startLevel(level) {
    const result = Object.assign(level);
    level.objects.length = 0;
    level.backgrounds.length = 0;
    level._counter = getNextCounter();
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
    if (!isNaN(level.name)) {
        window.location.hash = "#" + level.name;
    }
    return result;
}

function restartLevel(level) {
    const keyName = level.name;
    for (const name in levels) {
        if (name === keyName) {
            level.setLevel(startLevel(levels[name](level.setLevel)));
            return;
        }
    }
    throw new RangeError(`Level not found: ${keyName}`);
}

function getLevelNameFromRouter(location) {
    const s = location.pathname.substr(1);
    if (isNaN(s) || !(s in levels)) {
        return null;
    }
    return s;
}

function WalkieComponent(props) {
    const [level, setLevel] = React.useState(null);
    const onStart = () => {
        if (props.startLevel) {
            setLevel(startLevel(props.startLevel(setLevel)));
            return;
        }
        const name = getLevelNameFromRouter(props.location) || "1";
        setLevel(startLevel(levels[name](setLevel)));
    }; // Prevent exhaustive-deps eslint rule from firing
    React.useEffect(onStart, []);
    if (level === null) {
        return null;
    }
    const RenderLevel = level.render;
    return (
        <div className="walkie">
            <Level.Provider value={level}>
                <RenderLevel level={level}/>
            </Level.Provider>
        </div>
    );
}

export const Walkie = withRouter(WalkieComponent);

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
            <HashRouter hashType="noslash">
                <div className="app">
                    <Walkie/>
                </div>
                <Footer/>
            </HashRouter>
        </>
    );
}

const isDev = process.env.NODE_ENV !== 'production';

export default App;
