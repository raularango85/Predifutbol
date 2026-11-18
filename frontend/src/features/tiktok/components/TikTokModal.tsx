import React, { useEffect, useState } from 'react';
import type { Prediction } from '../../predictions/types';
import type { CardState } from '../../studio/types';
import { Button } from '../../../components/Button';
import { Copy, Check, X, Sparkles, Hash, FileText } from 'lucide-react';

interface TikTokModalProps {
  prediction: Prediction | CardState | null;
  onClose: () => void;
}

export const TikTokModal: React.FC<TikTokModalProps> = ({ prediction, onClose }) => {
  const [caption, setCaption] = useState<string>('');
  const [hashtags, setHashtags] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedType, setCopiedType] = useState<'all' | 'caption' | 'tags' | null>(null);

  useEffect(() => {
    if (!prediction) return;

    // Check if prediction already contains cached TikTok content
    const predWithTikTok = prediction as Prediction;
    if (predWithTikTok.tiktok_caption && predWithTikTok.tiktok_hashtags) {
      setCaption(predWithTikTok.tiktok_caption);
      setHashtags(predWithTikTok.tiktok_hashtags);
      return;
    }

    // Otherwise generate fresh algorithm-optimized tags from backend API
    const generateTags = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/tiktok/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(prediction),
        });
        const data = await res.json();
        if (data.success) {
          setCaption(data.caption || '');
          setHashtags(data.hashtags || '');
        }
      } catch (err) {
        console.error('Error generating TikTok tags:', err);
      } finally {
        setLoading(false);
      }
    };

    generateTags();
  }, [prediction]);

  if (!prediction) return null;

  const fullText = `${caption.trim()}\n\n${hashtags.trim()}`;

  const copyToClipboard = (text: string, type: 'all' | 'caption' | 'tags') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 max-w-xl w-full shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bebas text-2xl tracking-wide text-white">
                  COPY & HASHTAGS PARA TIKTOK
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Auto
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {prediction.home_name || 'LOCAL'} vs {prediction.away_name || 'VISITANTE'} • {prediction.league_name || 'FÚTBOL'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-Click Master Button */}
        <button
          type="button"
          onClick={() => copyToClipboard(fullText, 'all')}
          disabled={loading || !caption}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:opacity-95 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 transition transform active:scale-[0.98] cursor-pointer disabled:opacity-50"
        >
          {copiedType === 'all' ? (
            <>
              <Check className="w-4 h-4 text-slate-950" />
              <span>✅ ¡TODO COPIADO AL PORTAPAPELES (LISTO PARA TIKTOK)!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-slate-950" />
              <span>COPIAR TODO AL PORTAPAPELES (LISTO PARA TIKTOK)</span>
            </>
          )}
        </button>

        {/* Caption Box */}
        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Descripción / Copy del Video</span>
            </span>
            <button
              onClick={() => copyToClipboard(caption, 'caption')}
              disabled={loading || !caption}
              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {copiedType === 'caption' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedType === 'caption' ? '¡Copiado!' : 'Copiar solo descripción'}</span>
            </button>
          </div>
          <textarea
            rows={7}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500 leading-relaxed"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={loading ? 'Generando copy optimizado...' : 'Descripción para TikTok...'}
          />
        </div>

        {/* Hashtags Box */}
        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-cyan-400" />
              <span>Hashtags Recomendados (Algoritmo Limpio)</span>
            </span>
            <button
              onClick={() => copyToClipboard(hashtags, 'tags')}
              disabled={loading || !hashtags}
              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {copiedType === 'tags' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedType === 'tags' ? '¡Copiado!' : 'Copiar solo hashtags'}</span>
            </button>
          </div>
          <textarea
            rows={3}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder={loading ? 'Generando hashtags...' : 'Hashtags para TikTok...'}
          />
        </div>

        {/* Pro Tips Box */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-500/20 text-xs text-slate-400 space-y-1">
          <div className="font-bold text-cyan-300 flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tips para publicar tus 3-4 videos diarios:</span>
          </div>
          <p>• Pega este texto directamente en la descripción de TikTok al subir el video exportado.</p>
          <p>• Fija tu propio comentario preguntando: <em className="text-slate-300">«¿Quién gana hoy? ¡Los leo a todos! 👇»</em></p>
          <p>• Espacia las publicaciones (por ejemplo: mañana, mediodía, tarde y noche).</p>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 mt-1">
          <span className="text-[11px] text-slate-500 font-mono">PrediFutbol • Motor TikTok IA</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
