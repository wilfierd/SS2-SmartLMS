import React, { useState, useRef, useEffect } from 'react';
import './VideoPlayer.css';

const VideoPlayer = ({ videoUrl, title, onProgress, onComplete, containerMode = 'responsive' }) => {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [progress, setProgress] = useState(0);

    // Validate video URL to prevent showing the app inside video container
    const isValidVideoUrl = (url) => {
        if (!url) return false;

        // Check if it's a valid video file extension
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv'];
        const hasVideoExtension = videoExtensions.some(ext =>
            url.toLowerCase().includes(ext)
        );

        // Check if it's a valid video streaming URL
        const videoStreamingDomains = [
            'youtube.com',
            'youtu.be',
            'vimeo.com',
            'dailymotion.com',
            'wistia.com',
            'brightcove.com'
        ];

        const isStreamingUrl = videoStreamingDomains.some(domain =>
            url.toLowerCase().includes(domain)
        );

        // Check if it's NOT your app URL (prevent recursive display)
        const currentOrigin = window.location.origin;
        const isNotAppUrl = !url.includes(currentOrigin) && !url.startsWith('/');

        return (hasVideoExtension || isStreamingUrl) && isNotAppUrl;
    };

    // Handle different video URL types
    const renderVideoContent = () => {
        if (!videoUrl) {
            return (
                <div className="video-placeholder">
                    <div className="video-placeholder-content">
                        <i className="fas fa-video"></i>
                        <p>No video content available</p>
                    </div>
                </div>
            );
        }

        // If URL is not valid (like pointing to your app), show error
        if (!isValidVideoUrl(videoUrl)) {
            return (
                <div className="video-error">
                    <div className="video-error-content">
                        <i className="fas fa-exclamation-triangle"></i>
                        <p>Invalid video URL</p>
                        <small>Please provide a valid video file URL or streaming link</small>
                        <div className="error-details">
                            <strong>Current URL:</strong> {videoUrl}
                        </div>
                    </div>
                </div>
            );
        }        // Handle YouTube URLs - convert to embed URL if needed
        if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
            const videoId = extractYouTubeId(videoUrl);
            if (videoId) {
                return (
                    <iframe
                        src={`https://www.youtube.com/embed/${videoId}?rel=0&showinfo=0&modestbranding=1&autoplay=0`}
                        title={title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="video-iframe"
                        referrerPolicy="strict-origin-when-cross-origin"
                    />
                );
            }
        }

        // Handle Vimeo URLs  
        if (videoUrl.includes('vimeo.com')) {
            const videoId = extractVimeoId(videoUrl);
            if (videoId) {
                return (
                    <iframe
                        src={`https://player.vimeo.com/video/${videoId}`}
                        title={title}
                        frameBorder="0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        className="video-iframe"
                    />
                );
            }
        }

        // Handle direct video file URLs
        return (
            <video
                ref={videoRef}
                className="video-element"
                controls
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={handleVideoEnd}
            >
                <source src={videoUrl} type="video/mp4" />
                <source src={videoUrl} type="video/webm" />
                <source src={videoUrl} type="video/ogg" />
                Your browser does not support the video tag.
            </video>
        );
    };    const extractYouTubeId = (url) => {
        // Handle various YouTube URL formats
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^#&?]*)/,
            /youtube\.com\/watch\?.*v=([^#&?]*)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1] && match[1].length === 11) {
                return match[1];
            }
        }
        return null;
    };

    const extractVimeoId = (url) => {
        const regExp = /vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/;
        const match = url.match(regExp);
        return match ? match[3] : null;
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const current = videoRef.current.currentTime;
            const total = videoRef.current.duration;
            setCurrentTime(current);
            setProgress((current / total) * 100);

            if (onProgress) {
                onProgress(current, total);
            }
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleVideoEnd = () => {
        setIsPlaying(false);
        if (onComplete) {
            onComplete();
        }
    };

    const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };    return (
        <div className={`video-player ${containerMode === 'fixed' ? 'fixed-container' : ''}`}>
            <div className="video-container">
                {renderVideoContent()}
            </div>

            {videoRef.current && (
                <div className="video-controls">
                    <div className="video-progress">
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="time-display">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoPlayer;
