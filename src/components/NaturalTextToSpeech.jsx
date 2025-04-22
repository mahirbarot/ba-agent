import React, { useState, useEffect, useRef } from 'react';
const NaturalTextToSpeech = () => {
 const [text, setText] = useState(
   "Hello! This is a sample paragraph. Natural speech includes pauses, emphasis, and slight variations in tone. Good text-to-speech should mimic these human qualities. Notice how the pitch rises slightly at the end of questions? And how we naturally pause between sentences. With modern APIs, we can create much more realistic sounding speech than ever before."
 );
 const [isSpeaking, setIsSpeaking] = useState(false);
 const [isPaused, setIsPaused] = useState(false);
 const [availableVoices, setAvailableVoices] = useState([]);
 const [selectedVoice, setSelectedVoice] = useState('');
 const [rate, setRate] = useState(0.9); // Slightly slower than default for more natural sound
 const [pitch, setPitch] = useState(1.0);
 const utteranceRef = useRef(null);
 // Load available voices when component mounts
 useEffect(() => {
   const loadVoices = () => {
     const voices = window.speechSynthesis.getVoices();
     // Filter for higher quality voices (typically these have 'premium' or specific locale indicators)
     const qualityVoices = voices.filter(voice =>
       voice.name.includes('Premium') ||
       voice.name.includes('Enhanced') ||
       voice.name.includes('Neural') ||
       voice.name.includes('Google') ||  // Google voices tend to be higher quality
       voice.name.includes('Microsoft') ||
       (voice.lang === 'en-US' || voice.lang === 'en-GB')
     );
     setAvailableVoices(qualityVoices.length > 0 ? qualityVoices : voices);
     // Set a default voice, preferring premium/neural voices
     const defaultVoice = qualityVoices.find(voice =>
       voice.name.includes('Premium') ||
       voice.name.includes('Neural') ||
       voice.name.includes('Enhanced')
     );
     if (defaultVoice) {
       setSelectedVoice(defaultVoice.name);
     } else if (qualityVoices.length > 0) {
       setSelectedVoice(qualityVoices[0].name);
     } else if (voices.length > 0) {
       setSelectedVoice(voices[0].name);
     }
   };
   // Load voices immediately if available
   loadVoices();
   // Chrome loads voices asynchronously, so we need this event listener
   if (window.speechSynthesis.onvoiceschanged !== undefined) {
     window.speechSynthesis.onvoiceschanged = loadVoices;
   }
   // Cleanup
   return () => {
     stopSpeaking();
     if (window.speechSynthesis.onvoiceschanged !== undefined) {
       window.speechSynthesis.onvoiceschanged = null;
     }
   };
 }, []);
 // Process text to make it more natural sounding with SSML-like effects
 const processTextForNaturalSpeech = (text) => {
   // Add slight pauses after sentences
   let processedText = text.replace(/\./g, '.<break time="500ms">');
   // Add slight pauses after commas
   processedText = processedText.replace(/,/g, ',<break time="200ms">');
   // Add slight pauses for question marks and exclamation points
   processedText = processedText.replace(/\?/g, '?<break time="500ms">');
   processedText = processedText.replace(/!/g, '!<break time="500ms">');
   return processedText;
 };
 // Split text into sentences to add pauses between them
 const splitIntoSentences = (text) => {
   return text
     .replace(/([.?!])\s+(?=[A-Z])/g, "$1|")  // Split on sentence endings followed by a capital letter
     .split("|");
 };
 const speakText = () => {
   // Cancel any ongoing speech
   stopSpeaking();
   const sentences = splitIntoSentences(text);
   let currentIndex = 0;
   const speakNextSentence = () => {
     if (currentIndex < sentences.length) {
       const sentence = sentences[currentIndex];
       utteranceRef.current = new SpeechSynthesisUtterance(sentence);
       // Find the selected voice
       const voice = availableVoices.find(v => v.name === selectedVoice);
       if (voice) utteranceRef.current.voice = voice;
       utteranceRef.current.rate = rate;
       utteranceRef.current.pitch = pitch;
       // Add natural variations to each sentence
       if (currentIndex > 0) {
         // Slight randomness in rate and pitch for more natural speech
         utteranceRef.current.rate = rate * (0.95 + Math.random() * 0.1); // ±5% variation
         utteranceRef.current.pitch = pitch * (0.98 + Math.random() * 0.04); // ±2% variation
       }
       utteranceRef.current.onend = () => {
         currentIndex++;
         // Add a small pause between sentences
         setTimeout(speakNextSentence, 250);
       };
       utteranceRef.current.onerror = (event) => {
         console.error('SpeechSynthesis error:', event);
         setIsSpeaking(false);
       };
       window.speechSynthesis.speak(utteranceRef.current);
     } else {
       setIsSpeaking(false);
     }
   };
   setIsSpeaking(true);
   speakNextSentence();
 };
 const pauseSpeaking = () => {
   window.speechSynthesis.pause();
   setIsPaused(true);
 };
 const resumeSpeaking = () => {
   window.speechSynthesis.resume();
   setIsPaused(false);
 };
 const stopSpeaking = () => {
   window.speechSynthesis.cancel();
   setIsSpeaking(false);
   setIsPaused(false);
 };
 const handleVoiceChange = (e) => {
   setSelectedVoice(e.target.value);
 };
 const handleRateChange = (e) => {
   setRate(parseFloat(e.target.value));
 };
 const handlePitchChange = (e) => {
   setPitch(parseFloat(e.target.value));
 };
 return (
<div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
<h2 className="text-xl font-semibold mb-4">Natural Text-to-Speech</h2>
<div className="mb-4">
<label htmlFor="textInput" className="block mb-2 font-medium">
         Enter text to speak:
</label>
<textarea
         id="textInput"
         rows="5"
         className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
         value={text}
         onChange={(e) => setText(e.target.value)}
         disabled={isSpeaking}
       />
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
<div>
<label htmlFor="voiceSelect" className="block mb-2 font-medium">
           Select Voice:
</label>
<select
           id="voiceSelect"
           className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
           value={selectedVoice}
           onChange={handleVoiceChange}
           disabled={isSpeaking}
>
           {availableVoices.map((voice) => (
<option key={voice.name} value={voice.name}>
               {voice.name} ({voice.lang})
</option>
           ))}
</select>
</div>
<div>
<label htmlFor="rateSlider" className="block mb-2 font-medium">
           Speech Rate: {rate.toFixed(1)}
</label>
<input
           id="rateSlider"
           type="range"
           min="0.5"
           max="1.5"
           step="0.1"
           className="w-full"
           value={rate}
           onChange={handleRateChange}
           disabled={isSpeaking}
         />
<label htmlFor="pitchSlider" className="block mt-3 mb-2 font-medium">
           Pitch: {pitch.toFixed(1)}
</label>
<input
           id="pitchSlider"
           type="range"
           min="0.8"
           max="1.2"
           step="0.05"
           className="w-full"
           value={pitch}
           onChange={handlePitchChange}
           disabled={isSpeaking}
         />
</div>
</div>
<div className="flex space-x-3">
       {!isSpeaking ? (
<button
           onClick={speakText}
           className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
>
           Speak
</button>
       ) : (
<>
           {isPaused ? (
<button
               onClick={resumeSpeaking}
               className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
>
               Resume
</button>
           ) : (
<button
               onClick={pauseSpeaking}
               className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
>
               Pause
</button>
           )}
<button
             onClick={stopSpeaking}
             className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
>
             Stop
</button>
</>
       )}
</div>
<div className="mt-6">
<h3 className="font-medium mb-2">Tips for natural sounding speech:</h3>
<ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
<li>Use commas and periods to create natural pauses</li>
<li>Add ellipses (...) for longer pauses</li>
<li>Use question marks to get rising intonation</li>
<li>Slower speech rates often sound more natural</li>
<li>Try different voices - some sound more natural than others</li>
</ul>
</div>
</div>
 );
};
export default NaturalTextToSpeech;