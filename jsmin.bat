java -jar js.jar --js=sgfmmvc.js  --js_output_file=sgfmmvc.min.js
java -jar js.jar --js=play_gq.js --js_output_file=play_gq.min.js

copy sgfmmvc.min.js+play_gq.min.js sgfmplay.min.js
del sgfmmvc.min.js play_gq.min.js
pause