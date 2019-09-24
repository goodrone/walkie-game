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
    const moveUp = () => props.onSetPlayerPos({x: ctx.pos.x, y: ctx.pos.y - 1});
    const moveDown = () => props.onSetPlayerPos({x: ctx.pos.x, y: ctx.pos.y + 1});
    const moveLeft = () => props.onSetPlayerPos({x: ctx.pos.x - 1, y: ctx.pos.y});
    const moveRight = () => props.onSetPlayerPos({x: ctx.pos.x + 1, y: ctx.pos.y});
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
            console.log("!!!", elem);
        };
    };
    React.useEffect(addCallbacks, []);
    return (
        <div className="player" style={style}
            ref={ref}>
            &#x1f600;
        </div>
    );
}

function Object(props) {
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
                level.objects = generateObjects(level.width, level.height, results.pos);
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

function generateObjects(w, h, pos) {
    const numTargets = 3;
    const numWalls = 3 + Math.floor(Math.random() * 3);
    const num = numTargets + numWalls;
    const result = Array(num);
    for (let i = 0; i < num; i++) {
        do {
            result[i] = {
                x: Math.floor(Math.random() * w),
                y: Math.floor(Math.random() * h),
                type: i < numTargets ? ObjType.target : ObjType.wall,
                hp: 5,
            };
        } while (isCollision(result[i], pos) || findCollisionInArray(result[i], result, i) !== null);
    }
    return result;
}

function Walkie() {
    const [level, setLevel] = React.useState(() => {
        const x = {
            width: 7, height: 7, d: 45,
            score: 0,
            pos: {x: 3, y: 3},
        }
        x.objects = generateObjects(x.width, x.height, x.pos);
        return x;
    });
    const setPlayerPos = pos => setLevel(prev => ({...prev,
        ...sanitizePlayerPos(pos, prev)}));
    return (
        <div className="walkie">
            <Ctx.Provider value={level}>
                <div>{level.score}</div>
                <Map onSetPlayerPos={setPlayerPos}>
                    {level.objects.map((pos, i) => <Object key={i} pos={pos}/>)}
                    <Player/>
                </Map>
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
