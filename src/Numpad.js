import React from 'react';
import './Numpad.css';

function Numbers({ onAdd, active }) {
    const add = v => () => active && onAdd(v);
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

export function Numpad({ onValidate, onCancel, active }) {
    const [value, setValue] = React.useState("");
    const ref = React.useRef();
    const reset = () => {
        if (!active) {
            return;
        }
        if (value === "") {
            onCancel();
        } else {
            setValue("");
        }
    };
    const validate = n => {
        if (active && onValidate(n) !== true) {
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
                    disabled={value === ""}>&#x2713;</button>
            </div>
            <Numbers onAdd={s => setValue(v => v + s)} active={active}/>
        </div>
    );
}
