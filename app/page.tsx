'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Segment {
  id: number;
  text: string;
  start: number;
  end: number;
}

interface Project {
  id: string;
  title: string;
  segments: Segment[];
  recordings: { [key: number]: string };
}

export default function AudiobookCreator() {
  const [text, setText] = useState('');
  const [segments, setSegments] = useState<Segment[]>([]);
  const [currentSegment, setCurrentSegment] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<{ [key: number]: string }>({});
  const [selectedVoice, setSelectedVoice] = useState('default');
  const [voices, setVoices] = useState<any[]>([]);
  const [projectTitle, setProjectTitle] = useState('Untitled Project');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Sample texts
  const samples = {
    littlePrince: `It is only with the heart that one can see rightly; what is essential is invisible to the eye. The little prince never let go of a question once he had asked it. And he never let go of a thought once he had thought it. He was very serious about everything.`,
    theRaven: `Once upon a midnight dreary, while I pondered, weak and weary, Over many a quaint and curious volume of forgotten lore— While I nodded, nearly napping, suddenly there came a tapping, As of some one gently rapping, rapping at my chamber door. "'Tis some visitor," I muttered, "tapping at my chamber door— Only this and nothing more."`,
    shortStory: `The old lighthouse keeper had watched the sea for forty years. Every night he climbed the spiral stairs and lit the great lamp. The light swept across the water, warning ships of the dangerous rocks below. One stormy night, a ship appeared on the horizon. The keeper knew the rocks were close.`
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      
      const loadVoices = () => {
        const availableVoices = synthRef.current!.getVoices();
        setVoices(availableVoices);
      };
      
      loadVoices();
      synthRef.current.onvoiceschanged = loadVoices;
    }
  }, []);

  const loadSample = (sampleKey: keyof typeof samples) => {
    const sampleText = samples[sampleKey];
    setText(sampleText);
    setProjectTitle(sampleKey === 'littlePrince' ? 'The Little Prince' : 
                   sampleKey === 'theRaven' ? 'The Raven' : 'Short Story');
    segmentText(sampleText);
  };

  const segmentText = (inputText: string) => {
    if (!inputText.trim()) return;

    const sentences = inputText
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const newSegments: Segment[] = [];
    let currentIndex = 0;

    sentences.forEach((sentence, index) => {
      const start = inputText.indexOf(sentence, currentIndex);
      const end = start + sentence.length;
      
      newSegments.push({
        id: index,
        text: sentence,
        start: start,
        end: end
      });
      
      currentIndex = end;
    });

    setSegments(newSegments);
    setRecordings({});
    setCurrentSegment(null);
  };

  const playSegment = (segmentId: number) => {
    if (!synthRef.current || segments.length === 0) return;

    synthRef.current.cancel();

    const segment = segments[segmentId];
    if (!segment) return;

    const utterance = new SpeechSynthesisUtterance(segment.text);
    
    if (selectedVoice !== 'default' && voices.length > 0) {
      const voice = voices.find(v => v.name === selectedVoice);
      if (voice) utterance.voice = voice;
    }

    utterance.onend = () => {
      setIsPlaying(false);
      setCurrentSegment(null);
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
    
    setCurrentSegment(segmentId);
    setIsPlaying(true);
  };

  const playFullBook = () => {
    if (segments.length === 0) return;

    let index = 0;
    const playNext = () => {
      if (index >= segments.length) {
        setIsPlaying(false);
        setCurrentSegment(null);
        return;
      }

      const segment = segments[index];
      setCurrentSegment(segment.id);

      if (!synthRef.current) return;

      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(segment.text);
      
      if (selectedVoice !== 'default' && voices.length > 0) {
        const voice = voices.find(v => v.name === selectedVoice);
        if (voice) utterance.voice = voice;
      }

      utterance.onend = () => {
        index++;
        playNext();
      };

      utteranceRef.current = utterance;
      synthRef.current.speak(utterance);
    };

    setIsPlaying(true);
    playNext();
  };

  const stopPlayback = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsPlaying(false);
    setCurrentSegment(null);
  };

  const startRecording = async (segmentId: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setRecordings(prev => ({
          ...prev,
          [segmentId]: audioUrl
        }));
        
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setCurrentSegment(segmentId);
    } catch (error) {
      alert('Microphone access denied or not available.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const playRecording = (segmentId: number) => {
    const recordingUrl = recordings[segmentId];
    if (recordingUrl) {
      const audio = new Audio(recordingUrl);
      audio.play();
    }
  };

  const exportProject = () => {
    const project: Project = {
      id: Date.now().toString(),
      title: projectTitle,
      segments,
      recordings
    };

    const dataStr = JSON.stringify(project, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${projectTitle.toLowerCase().replace(/\s+/g, '-')}-audiobook.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const clearProject = () => {
    setText('');
    setSegments([]);
    setRecordings({});
    setCurrentSegment(null);
    setIsPlaying(false);
    setIsRecording(false);
    if (synthRef.current) synthRef.current.cancel();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">RefGame</h1>
            <p className="text-zinc-400 mt-1">Audiobook Creator</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => loadSample('littlePrince')}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
            >
              Little Prince
            </button>
            <button 
              onClick={() => loadSample('theRaven')}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
            >
              The Raven
            </button>
            <button 
              onClick={() => loadSample('shortStory')}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
            >
              Short Story
            </button>
          </div>
        </div>

        {/* Project Title */}
        <div className="mb-8">
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            className="text-2xl font-medium bg-transparent border-b border-zinc-800 focus:border-zinc-600 outline-none w-full pb-2"
          />
        </div>

        {/* Text Input */}
        <div className="mb-8">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your text here or load a sample above..."
            className="w-full h-48 bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-lg resize-y focus:outline-none focus:border-zinc-700"
          />
          <div className="flex gap-3 mt-3">
            <button 
              onClick={() => segmentText(text)}
              disabled={!text.trim()}
              className="px-6 py-2.5 bg-white text-black rounded-xl font-medium disabled:opacity-40 hover:bg-zinc-200 transition-colors"
            >
              Segment Text
            </button>
            <button 
              onClick={clearProject}
              className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Segments */}
        {segments.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium">Segments ({segments.length})</h2>
              <div className="flex gap-3">
                <select 
                  value={selectedVoice} 
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm"
                >
                  <option value="default">Default Voice</option>
                  {voices.map((voice, index) => (
                    <option key={index} value={voice.name}>{voice.name}</option>
                  ))}
                </select>
                <button 
                  onClick={playFullBook}
                  disabled={isPlaying}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 rounded-xl text-sm font-medium transition-colors"
                >
                  {isPlaying ? 'Playing...' : 'Play Full Book'}
                </button>
                <button 
                  onClick={stopPlayback}
                  disabled={!isPlaying}
                  className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-xl text-sm transition-colors"
                >
                  Stop
                </button>
                <button 
                  onClick={exportProject}
                  className="px-5 py-2 bg-white text-black hover:bg-zinc-200 rounded-xl text-sm font-medium transition-colors"
                >
                  Export Project
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {segments.map((segment) => (
                <div 
                  key={segment.id}
                  className={`group p-6 rounded-2xl border transition-all ${
                    currentSegment === segment.id 
                      ? 'bg-zinc-900 border-emerald-600' 
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-xs text-zinc-500 font-mono pt-1 w-8">
                      {segment.id + 1}
                    </div>
                    <div className="flex-1 text-lg leading-relaxed">
                      {segment.text}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pl-12">
                    <button 
                      onClick={() => playSegment(segment.id)}
                      className="px-4 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      Play TTS
                    </button>
                    
                    {!recordings[segment.id] ? (
                      <button 
                        onClick={() => startRecording(segment.id)}
                        disabled={isRecording}
                        className="px-4 py-1.5 text-sm bg-rose-600 hover:bg-rose-500 disabled:bg-rose-900 rounded-lg transition-colors"
                      >
                        {isRecording && currentSegment === segment.id ? 'Recording...' : 'Record Voice'}
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={() => playRecording(segment.id)}
                          className="px-4 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
                        >
                          Play Recording
                        </button>
                        <button 
                          onClick={() => startRecording(segment.id)}
                          className="px-4 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                          Re-record
                        </button>
                      </>
                    )}

                    {isRecording && currentSegment === segment.id && (
                      <button 
                        onClick={stopRecording}
                        className="px-4 py-1.5 text-sm bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
                      >
                        Stop Recording
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-zinc-500 mt-16">
          RefGame Audiobook Creator — MVP Demo • Built with StarNet
        </div>
      </div>
    </div>
  );
}
