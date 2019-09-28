import React from 'react';
import { Walkie, levels, colors } from '../App.js';
import './style.css';

export default {
  title: 'Levels',
};

export const win = () => <Walkie startLevel={levels.win(null)}/>;
export const chooseLevel = () => <Walkie startLevel={levels.chooseLevel}/>;
export const level1 = () => <Walkie startLevel={levels.t1}/>;
export const level2 = () => <Walkie startLevel={levels.t2}/>;
export const level3 = () => <Walkie startLevel={levels.t3}/>;
export const level4 = () => <Walkie startLevel={levels.t4}/>;
export const level5 = () => <Walkie startLevel={levels.t5}/>;
export const level6 = () => <Walkie startLevel={levels.t6}/>;
export const level7 = () => <Walkie startLevel={levels.t7}/>;
export const level8 = () => <Walkie startLevel={levels.t8}/>;
export const level9 = () => <Walkie startLevel={levels.t9}/>;
export const level10 = () => <Walkie startLevel={levels.t10}/>;
export const level11 = () => <Walkie startLevel={levels.t11}/>;
export const level12 = () => <Walkie startLevel={levels.t12}/>;
export const level13 = () => <Walkie startLevel={levels.t13}/>;

function ColorList({ colors }) {
    return (
        <div className="color-list">
            {colors.map((c, i) => <div style={{background: c}} key={i}/>)}
        </div>
    );
}

function PairwiseColors({ colors }) {
    return (
        <>
            {colors.map((c, i) => <ColorList key={i}
                colors={[c, colors[(i + 1) % colors.length]]}/>)}
        </>
    );
}

export const distinctColors = () => {
    return (
        <>
            <ColorList colors={colors}/>
            <PairwiseColors colors={colors}/>
        </>
    );
};
