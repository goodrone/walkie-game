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
    const moveUp = () => props.onSetPlayerPos([ctx.pos[0], ctx.pos[1] - 1]);
    const moveDown = () => props.onSetPlayerPos([ctx.pos[0], ctx.pos[1] + 1]);
    const moveLeft = () => props.onSetPlayerPos([ctx.pos[0] - 1, ctx.pos[1]]);
    const moveRight = () => props.onSetPlayerPos([ctx.pos[0] + 1, ctx.pos[1]]);
    const handler = e => {
        const rect = e.target.getBoundingClientRect();
        const p = e.touches[0];
        const rx = p.clientX - rect.left - rect.width / 2;
        const ry = p.clientY - rect.top - rect.height / 2;
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

function combine(...args) {
    return args.reduce((a, b) => {
        return b ? a + " " + b : a;
    });
}

function Player(props) {
    const ctx = React.useContext(Ctx);
    const style = {
        left: `${ctx.pos[0] * ctx.d}px`,
        top: `${ctx.pos[1] * ctx.d}px`,
        width: `${ctx.d}px`,
        height: `${ctx.d}px`,
    };
    return <div className={combine("player", ctx.score % 2 && "next")} style={style}/>;
}

function Object(props) {
    const ctx = React.useContext(Ctx);
    const style = {
        left: `${props.pos[0] * ctx.d}px`,
        top: `${props.pos[1] * ctx.d}px`,
        width: `${ctx.d}px`,
        height: `${ctx.d}px`,
    };
    return <div className="target" style={style}/>;
}

const Ctx = React.createContext();

function clamp(x, a, b) {
    return x < a ? a : x > b ? b : x;
}

function sanitizePlayerPos(pos, level) {
    const results = {
        pos: [
            clamp(pos[0], 0, level.width - 1),
            clamp(pos[1], 0, level.height - 1),
        ],
    };
    const x = findCollisionInArray(pos, level.objects);
    if (x !== null) {
        results.score = level.score + 1;
        level.objects.splice(x, 1);
        if (level.objects.length === 0) {
            level.objects = generateObjects(level.width, level.height, results.pos);
        }
    }
    return results;
}

function findCollisionInArray(pos, array, n) {
    const len = n === undefined ? array.length : n;
    console.log(pos, array, len);
    for (let i = 0; i < len; i++) {
        if (isCollision(pos, array[i])) {
            return i;
        }
    }
    return null;
}

function isCollision(a, b) {
    return a[0] === b[0] && a[1] === b[1];
}

function generateObjects(w, h, pos) {
    const n = 3;
    const result = Array(n);
    for (let i = 0; i < n; i++) {
        do {
            result[i] = [Math.floor(Math.random() * w), Math.floor(Math.random() * h)];
        } while (isCollision(result[i], pos) || findCollisionInArray(pos, result, i + 1));
    }
    return result;
}

function Walkie() {
    const [level, setLevel] = React.useState(() => {
        const x = {
            width: 7, height: 7, d: 45,
            score: 0,
            pos: [3, 3],
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
                    <Player/>
                    {level.objects.map((pos, i) => <Object key={i} pos={pos}/>)}
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
