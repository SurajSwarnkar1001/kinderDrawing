import { ColorSwatch, Group } from '@mantine/core';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Draggable from 'react-draggable';
import { SWATCHES } from '@/constants';

interface GeneratedResult {
    expression: string;
    answer: string;
}

interface Response {
    expr: string;
    result: string;
    assign: boolean;
}

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('rgb(255, 255, 255)');
    const [reset, setReset] = useState(false);
    const [dictOfVars, setDictOfVars] = useState({});
    const [result, setResult] = useState<GeneratedResult>();
    const [latexPosition, setLatexPosition] = useState({ x: 2, y: 10 });
    const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
    const [brushSize, setBrushSize] = useState(3);
    const [isErasing, setIsErasing] = useState(false);


    
    const speakResult = () => {
        if (result) {
            const text = `The result of ${result.expression} is ${result.answer}`; // Add extra words
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
    
            // Get the list of available voices
            const voices = speechSynthesis.getVoices();
            
            // Set a female voice (e.g., 'Google UK English Female')
            const selectedVoice = voices.find(voice => voice.name.toLowerCase().includes('female')); // Match any female voice
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
    
            speechSynthesis.speak(utterance);
        } else {
            alert('No result available to speak!');
        }
    };
    


    const openGoogleSearch = () => {
        if (result) {
            const query = encodeURIComponent(`${result.expression} = ${result.answer}`);
            const url = `https://www.youtube.com/search?q=${query}`;
            window.open(url, '_blank');
        } else {
            alert('No result available to search!');
        }
    };

    useEffect(() => {
        if (latexExpression.length > 0 && window.MathJax) {
            setTimeout(() => {
                window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub]);
            }, 0);
        }
    }, [latexExpression]);

    useEffect(() => {
        if (result) {
            renderLatexToCanvas(result.expression, result.answer);
        }
    }, [result]);

    useEffect(() => {
        if (reset) {
            resetCanvas();
            setLatexExpression([]);
            setResult(undefined);
            setDictOfVars({});
            setReset(false);
        }
    }, [reset]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight - canvas.offsetTop;
                ctx.lineCap = 'round';
                ctx.lineWidth = brushSize;
            }
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
        script.async = true;
        document.head.appendChild(script);

        script.onload = () => {
            window.MathJax.Hub.Config({
                tex2jax: { inlineMath: [['$', '$'], ['\\(', '\\)']] }
            });
        };

        return () => {
            document.head.removeChild(script);
        };
    }, [brushSize]);

    const renderLatexToCanvas = (expression: string, answer: string) => {
        const latex = `\\(\\LARGE{${expression} = ${answer}}\\)`;
        setLatexExpression([...latexExpression, latex]);

        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    };

    const resetCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.style.background = 'black';
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineWidth = brushSize;
                ctx.strokeStyle = isErasing ? 'black' : color;
                ctx.beginPath();
                ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                setIsDrawing(true);
            }
        }
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                ctx.stroke();
            }
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const runRoute = async () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const response = await axios({
                method: 'post',
                url: `${import.meta.env.VITE_API_URL}/calculate`,
                data: {
                    image: canvas.toDataURL('image/png'),
                    dict_of_vars: dictOfVars
                }
            });

            const resp = await response.data;
            console.log('Fetched data:', resp);
            resp.data.forEach((data: Response) => {
                if (data.assign === true) {
                    setDictOfVars({
                        ...dictOfVars,
                        [data.expr]: data.result
                    });
                }
            });

            resp.data.forEach((data: Response) => {
                setTimeout(() => {
                    setResult({
                        expression: data.expr,
                        answer: data.result
                    });
                }, 1000);
            });
        }
    };

    return (
        <>
            <div className="absolute top-0 right-0 z-30 p-4">
                <button
                    className="bg-cyan-950 text-white rounded-lg px-4 py-2 mb-2"
                    onClick={speakResult}
                >
                    SPEAK 🔊
                </button>
            </div>

            <div className="absolute top-12 right-0 z-30 p-4">

                {/* Google Search Button */}
                <button
                    className="bg-cyan-950 text-white rounded-lg px-4 py-2"
                    onClick={openGoogleSearch}
                >
                VIDEO 🎥
                </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <Button
                    onClick={() => setReset(true)}
                    className="z-20 bg-cyan-950 text-white rounded-lg"
                    variant="default"
                    color="white"
                >
                    RESET 🔄
                </Button>
                <Group className="z-20">
                    {SWATCHES.map((swatch) => (
                        <ColorSwatch key={swatch} color={swatch} onClick={() => setColor(swatch)} />
                    ))}
                </Group>
                <Button
                    onClick={runRoute}
                    className="z-20 bg-cyan-950 text-white rounded-lg"
                    variant="default"
                    color="white"
                >
                    GO ▶
                </Button>
                <div className="z-20 flex items-center space-x-4">
                    <Button
                        className="eraser-button bg-cyan-950 text-white rounded-lg"
                        onClick={() => setIsErasing(!isErasing)}
                    >
                        {isErasing ? 'PENCIL ✏️' : 'ERASER 🧽'}
                    </Button>
                    <input
                        type="range"
                        min="1"
                        max="10"
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="brush-slider"
                    />
                </div>
            </div>
            <canvas
                ref={canvasRef}
                id="canvas"
                className="absolute top-0 left-0 w-full h-full"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
            />
            {latexExpression &&
                latexExpression.map((latex, index) => (
                    <Draggable
                        key={index}
                        defaultPosition={latexPosition}
                        onStop={(e, data) => setLatexPosition({ x: data.x, y: data.y })}
                    >
                        <div className="absolute p-2 text-white rounded shadow-md">
                            <div className="latex-content">{latex}</div>
                        </div>
                    </Draggable>
                ))}
        </>
    );
}
