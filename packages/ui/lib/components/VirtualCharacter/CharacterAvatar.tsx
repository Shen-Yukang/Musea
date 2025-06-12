import type React from 'react';
import { useState } from 'react';
import { useStorage } from '@extension/shared';
import { characterStorage } from '@extension/storage';

// Character state from service
type CharacterState = {
  isVisible: boolean;
  isAnimating: boolean;
  isChatOpen: boolean;
  currentAnimation: string;
  position: { x: number; y: number };
};

type CharacterAvatarProps = {
  onCharacterClick: () => void;
  characterState: CharacterState;
};

export const CharacterAvatar: React.FC<CharacterAvatarProps> = ({ onCharacterClick, characterState }) => {
  const config = useStorage(characterStorage);
  const [isHovered, setIsHovered] = useState(false);

  // Don't render if character is not visible
  if (!characterState.isVisible) {
    return null;
  }

  // Get character size based on configuration
  const getCharacterSize = () => {
    const sizes = {
      small: 48,
      medium: 60,
      large: 72,
    };
    return sizes[config.appearance.size] || 60;
  };

  // Get character style based on configuration
  const getCharacterStyle = () => {
    const size = getCharacterSize();
    const isDark =
      config.appearance.theme === 'dark' ||
      (config.appearance.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    return {
      width: `${size}px`,
      height: `${size}px`,
      position: 'fixed' as const,
      left: `${characterState.position.x}px`,
      top: `${characterState.position.y}px`,
      zIndex: 10000,
      cursor: 'pointer',
      borderRadius: '50%',
      transition: 'all 0.3s ease',
      transform: isHovered ? 'scale(1.1)' : 'scale(1)',
      filter: isHovered ? 'brightness(1.1)' : 'brightness(1)',
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
      border: `2px solid ${isDark ? '#6b7280' : '#d1d5db'}`,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    };
  };

  // Get animation classes
  const getAnimationClasses = () => {
    const baseClasses = 'character-avatar';
    const animationClasses = {
      idle: 'animate-pulse',
      greeting: 'animate-bounce',
      thinking: 'animate-pulse',
      speaking: 'animate-pulse',
      celebrating: 'animate-bounce',
      encouraging: 'animate-pulse',
      sleeping: 'animate-pulse',
    };

    const animationClass = animationClasses[characterState.currentAnimation as keyof typeof animationClasses] || '';

    return `${baseClasses} ${animationClass}`;
  };

  // Render character based on style
  const renderCharacterContent = () => {
    const isDark =
      config.appearance.theme === 'dark' ||
      (config.appearance.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    switch (config.appearance.style) {
      case 'cute-mascot':
        return (
          <div className="flex items-center justify-center w-full h-full">
            {/* Cute mascot emoji/character */}
            <span style={{ fontSize: '24px' }}>
              {characterState.currentAnimation === 'sleeping'
                ? '😴'
                : characterState.currentAnimation === 'thinking'
                  ? '🤔'
                  : characterState.currentAnimation === 'celebrating'
                    ? '🎉'
                    : characterState.currentAnimation === 'encouraging'
                      ? '💪'
                      : characterState.isChatOpen
                        ? '😊'
                        : '🤖'}
            </span>
          </div>
        );

      case 'simple-geometric':
        return (
          <div className="flex items-center justify-center w-full h-full">
            <div
              style={{
                width: '60%',
                height: '60%',
                backgroundColor: isDark ? '#60a5fa' : '#3b82f6',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <div
                style={{
                  width: '40%',
                  height: '40%',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                }}
              />
            </div>
          </div>
        );

      case 'minimalist-icon':
        return (
          <div className="flex items-center justify-center w-full h-full">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke={isDark ? '#60a5fa' : '#3b82f6'} strokeWidth="2" />
              <circle cx="8" cy="10" r="1" fill={isDark ? '#60a5fa' : '#3b82f6'} />
              <circle cx="16" cy="10" r="1" fill={isDark ? '#60a5fa' : '#3b82f6'} />
              <path
                d="M8 14s1.5 2 4 2 4-2 4-2"
                stroke={isDark ? '#60a5fa' : '#3b82f6'}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center w-full h-full">
            <span style={{ fontSize: '24px' }}>🤖</span>
          </div>
        );
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className={getAnimationClasses()}
      style={getCharacterStyle()}
      onClick={onCharacterClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`${config.personality.name} - 点击聊天`}>
      {renderCharacterContent()}

      {/* Chat indicator */}
      {characterState.isChatOpen && (
        <div
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            width: '16px',
            height: '16px',
            backgroundColor: '#10b981',
            borderRadius: '50%',
            border: '2px solid white',
            animation: 'pulse 2s infinite',
          }}
        />
      )}

      {/* Animation indicator */}
      {characterState.isAnimating && characterState.currentAnimation !== 'idle' && (
        <div
          style={{
            position: 'absolute',
            top: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
          {characterState.currentAnimation === 'thinking' && '思考中...'}
          {characterState.currentAnimation === 'speaking' && '说话中...'}
          {characterState.currentAnimation === 'celebrating' && '庆祝！'}
          {characterState.currentAnimation === 'encouraging' && '加油！'}
          {characterState.currentAnimation === 'greeting' && '你好！'}
          {characterState.currentAnimation === 'sleeping' && '休息中...'}
        </div>
      )}
    </div>
  );
};

// CSS animations (to be included in global styles)
export const characterAvatarStyles = `
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .character-avatar {
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }

  .character-avatar:hover {
    animation-duration: 0.5s !important;
  }

  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  .animate-bounce {
    animation: bounce 1s infinite;
  }

  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
      animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
    }
    50% {
      transform: translateY(-25%);
      animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
    }
  }
`;
