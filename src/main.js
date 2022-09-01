import "./styles/style.scss";
import { Canvas } from "./webgl/Canvas";

const canvas = document.querySelector(".webgl");

console.log(canvas);
new Canvas(canvas);
