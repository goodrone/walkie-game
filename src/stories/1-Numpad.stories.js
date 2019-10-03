import { Numpad } from '../Numpad.js';
import React from 'react';
import './BoolChoice.css';

export default {
    title: 'Numpad',
    component: Numpad,
};

const style = {
    width: "315px",
    height: "315px",
    margin: "0 auto",
    border: "8px solid #232323",
};

function BoolChoice({ question, trueValue, falseValue, value, setValue }) {
    return (
        <div className="bool-choice">
            <div>{question}</div>
            <label>
                <input type="radio" checked={value === true}
                    onChange={() => setValue(true)}/>
                {trueValue}
            </label>
            <label>
                <input type="radio" checked={value === false}
                    onChange={() => setValue(false)}/>
                {falseValue}
            </label>
        </div>
    );
}

export const numpad = function NumpadStory() {
    const [accept, setAccept] = React.useState(false);
    return (
        <>
            <BoolChoice question="Accept the input?" trueValue="Yes"
                falseValue="No" value={accept} setValue={setAccept}/>
            <div style={style}>
                <Numpad active={true} onValidate={() => accept}/>
            </div>
        </>
    );
}
