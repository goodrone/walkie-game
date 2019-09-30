import React from 'react';
import { Walkie, levels, colors } from '../App.js';
import { StaticRouter } from "react-router-dom";
import { storiesOf } from '@storybook/react';
import './style.css';

/*
export default {
  title: 'Levels',
};
*/

function StartAtLevelName({ level }) {
    return (
        <StaticRouter location={"/" + level}>
            <Walkie/>
        </StaticRouter>
    );
}

function StartAtLevel({ level }) {
    return (
        <StaticRouter location="/">
            <Walkie startLevel={level}/>
        </StaticRouter>
    );
}

const stories = storiesOf("Levels", module);

stories.add("Win screen", () => <StartAtLevel level={levels.win(null)}/>);
stories.add("Choose level", () => <StartAtLevel level={levels.chooseLevel}/>);
for (const level in levels) {
    if (isNaN(level)) continue;
    stories.add("Level " + level, () => <StartAtLevelName level={level}/>);
}

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

storiesOf("Utils", module).add("Distinct colors", () => {
    return (
        <>
            <ColorList colors={colors}/>
            <PairwiseColors colors={colors}/>
        </>
    );
});
