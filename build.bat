rem Crear el sandbox.js para usar directamente en el navegador desde un <script>
mkdir build
call browserify ./browser-global.js -o ./build/resman.js
pause
