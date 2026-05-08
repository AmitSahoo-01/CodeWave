import React, { useEffect, useState } from 'react';
import { getFilesMetaMap } from '../utils/fileSystem';
import { ydoc } from '../utils/yjsSetup';

const LivePreview = () => {
    const [htmlContent, setHtmlContent] = useState('');

    useEffect(() => {
        let timeout;
        
        const updatePreview = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                const metaMap = getFilesMetaMap();
                let htmlFileId = null;
                let cssFileId = null;
                let jsFileId = null;

                for (let [key, val] of metaMap.entries()) {
                    if (val.language === 'html' && !htmlFileId) htmlFileId = key;
                    if (val.language === 'css' && !cssFileId) cssFileId = key;
                    if (val.language === 'javascript' && !jsFileId) jsFileId = key;
                }

                let html = htmlFileId ? ydoc.getText(htmlFileId).toString() : '';
                if (!html) {
                    setHtmlContent('<html><body><h2 style="font-family:sans-serif;color:#555;padding:20px;">Create an index.html file to see live preview</h2></body></html>');
                    return;
                }

                const css = cssFileId ? ydoc.getText(cssFileId).toString() : '';
                const js = jsFileId ? ydoc.getText(jsFileId).toString() : '';

                let finalHtml = html;
                if (css) {
                    const headEndIdx = finalHtml.indexOf('</head>');
                    if (headEndIdx !== -1) {
                        finalHtml = finalHtml.substring(0, headEndIdx) + `<style>${css}</style>` + finalHtml.substring(headEndIdx);
                    }
                }
                if (js) {
                    const bodyEndIdx = finalHtml.indexOf('</body>');
                    if (bodyEndIdx !== -1) {
                        finalHtml = finalHtml.substring(0, bodyEndIdx) + `<script>${js}</script>` + finalHtml.substring(bodyEndIdx);
                    }
                }
                setHtmlContent(finalHtml);
            }, 500); // 500ms debounce
        };

        ydoc.on('update', updatePreview);
        updatePreview();

        return () => {
            ydoc.off('update', updatePreview);
            clearTimeout(timeout);
        };
    }, []);

    return (
        <div className="h-full w-full flex flex-col bg-white">
            <div className="flex items-center px-4 py-1.5 bg-[#252526] text-xs font-semibold text-gray-300 border-b border-[#333]">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500/80 animate-pulse"></span>
                    LIVE PREVIEW
                </div>
            </div>
            <div className="flex-1 bg-white">
                <iframe
                    title="live-preview"
                    className="w-full h-full border-none bg-white"
                    srcDoc={htmlContent}
                    sandbox="allow-scripts allow-modals"
                />
            </div>
        </div>
    );
};
export default LivePreview;
