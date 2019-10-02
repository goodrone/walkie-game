import React from 'react';
import './Numpad.css';

function Numbers({ onAdd }) {
    const add = v => () => onAdd(v);
    const num = n => <button onClick={add(n)}>{n}</button>;
    return (
        <div className="numbers">
            <div>
                {num("1")}{num("2")}{num("3")}
            </div>
            <div>
                {num("4")}{num("5")}{num("6")}
            </div>
            <div>
                {num("7")}{num("8")}{num("9")}
            </div>
            <div>
                {num("0")}
            </div>
        </div>
    );
}

export function Numpad({ onValidate, onCancel }) {
    const [value, setValue] = React.useState("");
    const ref = React.useRef();
    const reset = () => {
        if (value === "") {
            onCancel();
        } else {
            setValue("");
        }
    };
    const validate = n => {
        if (onValidate(n) !== true) {
            ref.current.classList.remove("animate-shake");
            void ref.current.offsetWidth;
            ref.current.classList.add("animate-shake");
        }
    };
    return (
        <div className="numpad">
            <div className="display">
                <button onClick={reset} className="cancel">&times;</button>
                <div ref={ref} className="value">{value}</div>
                <button onClick={() => validate(value)} className="accept"
                    disabled={value === ""}>&#9658;</button>
            </div>
            <Numbers onAdd={s => setValue(v => v + s)}/>
        </div>
    );
}
