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
        ref.current.focus();
    }, []);
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
    };
    React.useEffect(addCallbacks, []);
    return (
        <div className="player" style={style}
            ref={ref}>
            &#x1f642;
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
            {type.render && type.render()}
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
        if (o.type === ObjType.target) {
            results.score = level.score + 1;
            level.objects.splice(x, 1);
            if (numberOfObjTypes(level.objects, ObjType.target) === 0) {
                return level.nextLevel(level.setLevel);
            }
            level.pos.animateEat();
        } else if (o.type === ObjType.wall) {
            o.hp -= 1;
            if (o.hp <= 0) {
                level.objects.splice(x, 1);
            }
            return {};
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

const ObjType = {
    target: {
        className: "target",
        render: () => {
            return <>&#x1f352;</>;
        },
    },
    wall: {
        className: "wall",
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
        pos: {x: 2, y: 3},
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
                {x: 1, y: 4}, {x: 1, y: 5}, {x: 2, y: 5},),
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
        nextLevel: winAndSetNextByTemplate(levels.t1, setLevel),
    }),
    t4: setLevel => ({
        ...baseLevel, _name: "t4", setLevel,
        pos: {x: 2, y: 1},
        onLoad: [
            $addObjectsOfType(ObjType.target, {x: 2, y: 5}),
            $addObjectsOfType(ObjType.wall,
                {x: 0, y: 3}, {x: 1, y: 3}, {x: 2, y: 3}, {x: 3, y: 3}, {x: 4, y: 3}),
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
                }, 300);
                return () => clearTimeout(t);
            }, []);
            return (
                <div className="win-level" style={style}>
                    {show && <button onClick={next} ref={ref}>&#x25b6;</button>}
                </div>
            );
        },
    }),
};
const firstLevel = levels.t4;

function startLevel(level) {
    const result = Object.assign(level);
    console.log("startLevel", level);
    level.objects.length = 0;
    if (Array.isArray(level.onLoad)) {
        level.onLoad.map(f => f(result));
    }
    return result;
}

function Walkie() {
    const [level, setLevel] = React.useState(null);
    React.useEffect(() => {
        setLevel(startLevel(firstLevel(setLevel)));
    }, []);
    if (level === null) {
        return null;
    }
    const RenderLevel = level.render;
    return (
        <div className="walkie">
            <Ctx.Provider value={level}>
                <div>{level.score} | {level.objects.length}</div>
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
