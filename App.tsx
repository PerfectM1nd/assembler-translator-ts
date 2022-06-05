import React, {useState} from 'react';
import './styles.scss';
import {Assembler} from './src/scripts/classes/Assembler';

const App: React.FC = () => {
  const [textToTranslate, setTextToTranslate] = useState('');
  const [compiledText, setCompiledText] = useState<number | string>('');
  const [objectCode, setObjectCode] = useState<number | string>('');

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextToTranslate(event.target.value);
  };

  const handleClick = () => {
    const assembler = new Assembler();
    const [compiled, object] = assembler.compile(textToTranslate);
    object && setObjectCode(object);
    setCompiledText(compiled);
  };

  const clear = () => {
    setTextToTranslate('');
    setCompiledText('');
  }

  return (
    <div className='container'>
      <div className='form'>
        <div className='output-container'>
          <div className='output-block'>
            <div className='output-text-title'>Введите код:</div>
            <textarea
              name='code-input'
              id='code-input'
              cols={30}
              rows={10}
              onChange={handleChange}
              value={textToTranslate}
            ></textarea>
            <div className='buttons-container'>
              <div className='button' onClick={handleClick}>
                Скомпилировать код
              </div>
              <div className='button button-clear' onClick={clear}>
                Очистить код
              </div>
            </div>
          </div>
          <div className='output-block'>
            <div className='output-text-title'>Результат листинга кода:</div>
            <div className='output-text'>
              {compiledText}
              {
                objectCode &&
                  <>
                    <br/> <br/>
                    <div>
                      Объектный код: {objectCode}
                    </div>
                  </>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default App;