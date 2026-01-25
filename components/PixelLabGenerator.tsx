'use client';

import { useState } from 'react';
import PixelIcon from './PixelIcon';
import ProcessingLoader from './ProcessingLoader';

interface PixelLabGeneratorProps {
  onImageGenerated?: (imageUrl: string, metadata: any) => void;
}

export default function PixelLabGenerator({ onImageGenerated }: PixelLabGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [width, setWidth] = useState(64);
  const [height, setHeight] = useState(64);
  const [transparent, setTransparent] = useState(false);
  const [model, setModel] = useState<'pixflux' | 'bitforge'>('pixflux');
  const [shading, setShading] = useState('medium shading');
  const [detail, setDetail] = useState('medium detail');
  const [direction, setDirection] = useState('front');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('프롬프트를 입력해주세요');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const response = await fetch('/api/pixellab/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model,
          width,
          height,
          transparent,
          shading,
          detail,
          direction,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '이미지 생성 실패');
      }

      if (data.imageUrl || data.image) {
        const imageUrl = data.imageUrl || data.image;
        setGeneratedImage(imageUrl);
        if (onImageGenerated) {
          onImageGenerated(imageUrl, data.metadata);
        }
      } else {
        throw new Error('이미지 URL을 받지 못했습니다');
      }
    } catch (err: any) {
      setError(err.message || '이미지 생성 중 오류가 발생했습니다');
      console.error('PixelLab generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
        <PixelIcon name="image" size={20} />
        PixelLab 이미지 생성
      </h3>

      {/* 프롬프트 입력 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          프롬프트
        </label>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="예: pixel art UI panel frame, two-tone shading, white outline"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* 크기 설정 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            너비 (32-400)
          </label>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(Math.max(32, Math.min(400, parseInt(e.target.value) || 64)))}
            min={32}
            max={400}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            높이 (32-400)
          </label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(Math.max(32, Math.min(400, parseInt(e.target.value) || 64)))}
            min={32}
            max={400}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* 모델 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          모델
        </label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value as 'pixflux' | 'bitforge')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="pixflux">Pixflux (최대 400x400)</option>
          <option value="bitforge">Bitforge (최대 200x200)</option>
        </select>
      </div>

      {/* 스타일 옵션 */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            쉐이딩
          </label>
          <select
            value={shading}
            onChange={(e) => setShading(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="flat shading">Flat</option>
            <option value="basic shading">Basic</option>
            <option value="medium shading">Medium</option>
            <option value="detailed shading">Detailed</option>
            <option value="highly detailed shading">Highly Detailed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            디테일
          </label>
          <select
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="low detail">Low</option>
            <option value="medium detail">Medium</option>
            <option value="highly detailed">High</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            방향
          </label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="front">Front</option>
            <option value="side">Side</option>
            <option value="top-down">Top-down</option>
            <option value="isometric">Isometric</option>
          </select>
        </div>
      </div>

      {/* 투명 배경 옵션 */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="transparent"
          checked={transparent}
          onChange={(e) => setTransparent(e.target.checked)}
          disabled={width * height < 200 * 200}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="transparent" className="text-sm text-gray-700">
          투명 배경 {width * height < 200 * 200 && '(200x200 이상만 지원)'}
        </label>
      </div>

      {/* 생성 버튼 */}
      <button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <ProcessingLoader size={16} variant="inline" tone="indigo" />
            생성 중...
          </>
        ) : (
          <>
            <PixelIcon name="image" size={16} />
            이미지 생성
          </>
        )}
      </button>

      {/* 에러 메시지 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 생성된 이미지 */}
      {generatedImage && (
        <div className="space-y-2">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            이미지가 생성되었습니다!
          </div>
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex items-center justify-center">
            <img
              src={generatedImage}
              alt="Generated pixel art"
              className="max-w-full h-auto"
            />
          </div>
          <div className="flex gap-2">
            <a
              href={generatedImage}
              download="pixel-art.png"
              className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm text-center flex items-center justify-center gap-2"
            >
              <PixelIcon name="download" size={16} />
              다운로드
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
