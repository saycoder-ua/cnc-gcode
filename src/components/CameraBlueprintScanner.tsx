import React, { useState, useRef, useEffect } from 'react';
import { DrawingData, ContourPoint } from '../types/cnc';
import { useLanguage } from '../context/LanguageContext';
import { PRESET_DRAWINGS } from '../data/presetDrawings';
import {
  Camera,
  Upload,
  Layers,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Eye,
  Sliders,
  AlertCircle,
  FileCode2,
  Zap,
  Image as ImageIcon,
  SwitchCamera
} from 'lucide-react';

interface CameraBlueprintScannerProps {
  onGenerateGCode: (drawing: DrawingData) => void;
}

export const CameraBlueprintScanner: React.FC<CameraBlueprintScannerProps> = ({
  onGenerateGCode
}) => {
  const { t } = useLanguage();

  const [activeMode, setActiveMode] = useState<'camera' | 'upload' | 'gallery'>('camera');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'normal' | 'contrast' | 'invert'>('contrast');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Extracted blueprint parameters
  const [partName, setPartName] = useState<string>('Scanned Medical Guide Pin');
  const [material, setMaterial] = useState<string>('SS304');
  const [diameter, setDiameter] = useState<number>(5.8);
  const [length, setLength] = useState<number>(38.0);
  const [stickout, setStickout] = useState<number>(36.0);
  const [roughnessRa, setRoughnessRa] = useState<number>(0.8);
  const [contourPoints, setContourPoints] = useState<ContourPoint[]>([
    { point_id: 1, type: 'start', x_diameter: 0.0, z_coordinate: 0.0 },
    { point_id: 2, type: 'face', x_diameter: 5.8, z_coordinate: 0.0 },
    { point_id: 3, type: 'chamfer', x_diameter: 2.5, z_coordinate: -1.0, chamfer: 0.5 },
    { point_id: 4, type: 'turn', x_diameter: 2.5, z_coordinate: -14.0 },
    { point_id: 5, type: 'arc_ccw', x_diameter: 3.8, z_coordinate: -16.0, radius: 1.5 },
    { point_id: 6, type: 'turn', x_diameter: 3.8, z_coordinate: -24.0 },
    { point_id: 7, type: 'groove', x_diameter: 3.0, z_coordinate: -26.0, groove_width: 1.5 },
    { point_id: 8, type: 'turn', x_diameter: 5.8, z_coordinate: -32.0 },
    { point_id: 9, type: 'cutoff', x_diameter: 0.0, z_coordinate: -33.5 }
  ]);

  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle Camera Stream
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (cameraActive && activeMode === 'camera') {
      navigator.mediaDevices
        ?.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch(() => {});
          }
          setCameraError(null);
        })
        .catch((err) => {
          setCameraError(t('cameraError'));
          setCameraActive(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraActive, activeMode, facingMode, t]);

  // Capture Snapshot from Camera
  const handleCaptureSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    setCameraActive(false);

    // Simulate AI blueprint optical recognition
    triggerBlueprintAnalysis('Captured Camera Blueprint');
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedImage(dataUrl);
      triggerBlueprintAnalysis(file.name.replace(/\.[^/.]+$/, ''));
    };
    reader.readAsDataURL(file);
  };

  // Optical analysis simulation
  const triggerBlueprintAnalysis = (name: string) => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setPartName(name);
      setIsAnalyzing(false);
    }, 800);
  };

  // Load Preset from Gallery
  const handleSelectPreset = (preset: typeof PRESET_DRAWINGS[0]) => {
    setPartName(preset.part_name);
    setMaterial(preset.material);
    setDiameter(preset.workpiece.diameter_or_width_mm);
    setLength(preset.workpiece.length_mm);
    setStickout(preset.workpiece.stickout_mm || preset.workpiece.length_mm + 4);
    setContourPoints(preset.contour_points);
    setRoughnessRa(preset.roughness_requirements.general_ra);
    setCapturedImage(null);
  };

  // Direct Code Generation
  const handleExecuteGenerate = () => {
    const drawingData: DrawingData = {
      operation_type: diameter <= 7 ? 'swiss_turning' : 'turning',
      material: material,
      part_name: partName,
      workpiece: {
        diameter_or_width_mm: diameter,
        length_mm: length,
        stickout_mm: stickout,
        guide_bushing_clearance_mm: 0.008
      },
      contour_points: contourPoints,
      roughness_requirements: {
        general_ra: roughnessRa,
        critical_surfaces: [`Ra ${roughnessRa} on turned diameters`]
      }
    };

    onGenerateGCode(drawingData);
    setAppliedSuccess(true);
    setTimeout(() => setAppliedSuccess(false), 2000);
  };

  // Filter effect style
  const getFilterStyle = () => {
    if (filterMode === 'contrast') {
      return 'contrast(180%) grayscale(100%) brightness(110%)';
    }
    if (filterMode === 'invert') {
      return 'invert(100%) hue-rotate(180deg) contrast(150%)';
    }
    return 'none';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold shadow-md">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-100 text-base tracking-wide uppercase">
              {t('scannerTitle')}
            </h3>
            <p className="text-xs text-slate-400">
              {t('scannerSubtitle')}
            </p>
          </div>
        </div>

        {/* Generate Code Action Button */}
        <button
          onClick={handleExecuteGenerate}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-2 shadow-lg transition transform active:scale-95"
        >
          {appliedSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('scanSuccess')}</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>{t('generateCodeBtn')}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveMode('camera')}
          className={`px-4 py-2 rounded text-xs font-semibold flex items-center gap-2 transition ${
            activeMode === 'camera'
              ? 'bg-cyan-600 text-white shadow'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>{t('cameraMode')}</span>
        </button>

        <button
          onClick={() => setActiveMode('upload')}
          className={`px-4 py-2 rounded text-xs font-semibold flex items-center gap-2 transition ${
            activeMode === 'upload'
              ? 'bg-cyan-600 text-white shadow'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{t('uploadMode')}</span>
        </button>

        <button
          onClick={() => setActiveMode('gallery')}
          className={`px-4 py-2 rounded text-xs font-semibold flex items-center gap-2 transition ${
            activeMode === 'gallery'
              ? 'bg-cyan-600 text-white shadow'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{t('presetsMode')}</span>
        </button>
      </div>

      {/* Main Scanner Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Camera Viewfinder / Upload Preview (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between shadow-xl">
          <div>
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-800">
              <span className="text-xs font-mono-code text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                Фильтр CAD-контраста:
              </span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800 text-xs font-mono-code">
                <button
                  onClick={() => setFilterMode('normal')}
                  className={`px-2 py-0.5 rounded transition ${
                    filterMode === 'normal' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t('filterOriginal')}
                </button>
                <button
                  onClick={() => setFilterMode('contrast')}
                  className={`px-2 py-0.5 rounded transition ${
                    filterMode === 'contrast' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t('filterHighContrast')}
                </button>
                <button
                  onClick={() => setFilterMode('invert')}
                  className={`px-2 py-0.5 rounded transition ${
                    filterMode === 'invert' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t('filterInvert')}
                </button>
              </div>
            </div>

            {/* Viewport Area */}
            <div className="relative w-full h-[360px] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
              {/* Mode 1: Live Camera */}
              {activeMode === 'camera' && (
                <>
                  {cameraActive ? (
                    <div className="relative w-full h-full">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ filter: getFilterStyle() }}
                        className="w-full h-full object-cover"
                      />
                      {/* Technical Blueprint Reticle Overlay */}
                      <div className="absolute inset-0 pointer-events-none border-2 border-cyan-500/40 m-6 rounded-md">
                        <div className="absolute top-2 left-2 text-[10px] font-mono-code text-cyan-400 bg-slate-950/80 px-1.5 py-0.5 rounded">
                          ALIGN BLUEPRINT AXIS / НАВЕДИТЕ НА ЧЕРТЁЖ
                        </div>
                        {/* Center Crosshair */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-40">
                          <div className="w-12 h-0.5 bg-amber-400"></div>
                          <div className="h-12 w-0.5 bg-amber-400 absolute"></div>
                        </div>
                      </div>
                    </div>
                  ) : capturedImage ? (
                    <div className="relative w-full h-full">
                      <img
                        src={capturedImage}
                        alt="Captured Blueprint"
                        style={{ filter: getFilterStyle() }}
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute bottom-2 left-2 bg-slate-950/80 px-2 py-1 rounded text-[11px] font-mono-code text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Снимок зафиксирован
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-6 space-y-3">
                      <Camera className="w-12 h-12 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400 max-w-sm">
                        Наведите камеру на инженерный чертёж, эскиз или экран CAD. Система выделит диаметры, длину и контур детали.
                      </p>
                      {cameraError && (
                        <div className="text-xs text-rose-400 bg-rose-950/60 p-2 rounded border border-rose-800">
                          {cameraError}
                        </div>
                      )}
                      <button
                        onClick={() => setCameraActive(true)}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 mx-auto transition"
                      >
                        <Camera className="w-4 h-4" />
                        {t('startCamera')}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Mode 2: Upload File / Photo */}
              {activeMode === 'upload' && (
                <>
                  {capturedImage ? (
                    <div className="relative w-full h-full">
                      <img
                        src={capturedImage}
                        alt="Uploaded Blueprint"
                        style={{ filter: getFilterStyle() }}
                        className="w-full h-full object-contain"
                      />
                      <button
                        onClick={() => setCapturedImage(null)}
                        className="absolute top-2 right-2 bg-slate-900/90 text-slate-300 hover:text-white px-2 py-1 rounded text-xs border border-slate-700"
                      >
                        Загрузить другое фото
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-cyan-500/60 cursor-pointer p-6 transition group"
                    >
                      <Upload className="w-10 h-10 text-slate-600 group-hover:text-cyan-400 mb-3 transition" />
                      <span className="text-xs font-semibold text-slate-300 mb-1">
                        {t('dropPhotoHere')}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono-code">
                        {t('browseFiles')}
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Mode 3: Preset Blueprints Gallery */}
              {activeMode === 'gallery' && (
                <div className="w-full h-full p-4 overflow-y-auto space-y-2">
                  <span className="text-xs font-mono-code text-slate-400 block mb-2">
                    Выберите чертёж для мгновенного тестирования сканера:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {PRESET_DRAWINGS.map((p, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectPreset(p)}
                        className={`p-3 rounded border cursor-pointer transition text-left flex flex-col justify-between ${
                          partName === p.part_name
                            ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs line-clamp-1">{p.part_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono-code mt-0.5">
                            {p.material} &bull; Ø{p.workpiece.diameter_or_width_mm} &times; {p.workpiece.length_mm} мм
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono-code mt-2">
                          {p.contour_points.length} точек контура
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Analyzing Spinner Overlay */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-cyan-400 z-20">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                  <span className="text-xs font-mono-code font-bold">
                    {t('scanningWait')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Camera Controls Bar */}
          {activeMode === 'camera' && cameraActive && (
            <div className="mt-3 flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1.5 border border-slate-700 font-mono-code"
              >
                <SwitchCamera className="w-3.5 h-3.5" />
                <span>{t('switchCamera')}</span>
              </button>

              <button
                onClick={handleCaptureSnapshot}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-2 shadow-lg"
              >
                <Camera className="w-4 h-4" />
                <span>{t('takeSnapshot')}</span>
              </button>

              <button
                onClick={() => setCameraActive(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded text-xs border border-slate-700 font-mono-code"
              >
                {t('stopCamera')}
              </button>
            </div>
          )}
        </div>

        {/* Right: Recognized Parameters & Live Profile Preview (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between shadow-xl space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h4 className="font-display font-semibold text-slate-200 text-xs uppercase tracking-wider">
                  {t('extractedData')}
                </h4>
              </div>
              <span className="text-[10px] font-mono-code bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded">
                OCR PARSED
              </span>
            </div>

            {/* Editable Extracted Fields */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Наименование детали / Part Name:</label>
                <input
                  type="text"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono-code outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Материал (Material):</label>
                  <select
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-amber-300 font-mono-code outline-none focus:border-cyan-400"
                  >
                    <option value="SS304">SS304 (Нержавеющая)</option>
                    <option value="SS303">SS303 (Автоматная)</option>
                    <option value="CW614N">CW614N (Латунь)</option>
                    <option value="AL6061-T6">AL6061 (Алюминий)</option>
                    <option value="AISI 4140">4140 (Легированная)</option>
                    <option value="Ti-6Al-4V">Ti-6Al-4V (Титан)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">{t('barDiameter')}:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={diameter}
                    onChange={(e) => setDiameter(parseFloat(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-mono-code outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">{t('partLength')}:</label>
                  <input
                    type="number"
                    step="0.5"
                    value={length}
                    onChange={(e) => setLength(parseFloat(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono-code outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">{t('stickout')}:</label>
                  <input
                    type="number"
                    step="0.5"
                    value={stickout}
                    onChange={(e) => setStickout(parseFloat(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono-code outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Требуемая шероховатость Ra (мкм):</label>
                <input
                  type="number"
                  step="0.1"
                  value={roughnessRa}
                  onChange={(e) => setRoughnessRa(parseFloat(e.target.value) || 0.8)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-emerald-300 font-mono-code outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Extracted Contour Node Summary */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1">
                <span>Распознанные точки профиля:</span>
                <span className="font-mono-code text-cyan-400 font-bold">{contourPoints.length} кадров</span>
              </div>
              <div className="max-h-[110px] overflow-y-auto bg-slate-950 p-2 rounded border border-slate-800 text-[10px] font-mono-code space-y-1">
                {contourPoints.map((pt, i) => (
                  <div key={i} className="flex justify-between text-slate-400 hover:text-slate-200">
                    <span className="text-amber-400">N{pt.point_id} {pt.type.toUpperCase()}</span>
                    <span>X{pt.x_diameter.toFixed(2)} Z{pt.z_coordinate.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Action Button */}
          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={handleExecuteGenerate}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-lg transition"
            >
              <FileCode2 className="w-4 h-4" />
              <span>{t('generateCodeBtn')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
