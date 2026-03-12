import type { Comment } from '@/types/branch';
import { lucas } from '../collaborators';

export const code = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PawMatch - Luna's Stories</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <script src="https://unpkg.com/lucide@latest"><\/script>
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">

    <style>
        body {
            font-family: 'Nunito', sans-serif;
            background-color: #FFF2EB;
        }
        .card-shadow {
            box-shadow: 0 20px 40px -15px rgba(251, 146, 60, 0.2);
        }
        .action-btn {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .action-btn:hover { transform: scale(1.1); }
        .action-btn:active { transform: scale(0.95); }

        /* Mystery image placeholder */
        .mystery-img {
            background: linear-gradient(135deg, #FED7AA 0%, #FDBA74 50%, #FB923C 100%);
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        .mystery-img::before {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.3) 0%, transparent 70%);
            animation: shimmer 2s ease-in-out infinite;
        }
        @keyframes shimmer {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
        }
        .mystery-img:hover {
            transform: scale(1.02);
            box-shadow: 0 8px 25px rgba(251, 146, 60, 0.3);
        }

        /* Generated image reveal */
        .story-img {
            transition: all 0.4s ease;
        }
        .story-img img {
            animation: fadeIn 0.5s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(1.05); }
            to { opacity: 1; transform: scale(1); }
        }

        /* Loading pulse */
        .generating {
            background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FCD34D 100%);
            animation: pulse-bg 1.5s ease-in-out infinite;
        }
        @keyframes pulse-bg {
            0%, 100% { opacity: 0.7; }
            50% { opacity: 1; }
        }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center py-6 px-4 selection:bg-orange-200">

    <main class="bg-white rounded-[2.5rem] p-6 pb-5 max-w-[400px] w-full card-shadow relative">

        <!-- Compact Profile Header -->
        <div class="flex items-center gap-4 mb-5">
            <div class="relative shrink-0">
                <img
                    src="https://images.unsplash.com/photo-1552053831-71594a27632d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
                    alt="Luna the Golden Retriever"
                    class="w-20 h-20 object-cover rounded-full border-4 border-orange-50 shadow-sm"
                >
                <div class="absolute bottom-0 right-0 w-5 h-5 bg-green-400 border-[3px] border-white rounded-full"></div>
            </div>
            <div class="flex-1 min-w-0">
                <h1 class="text-xl font-extrabold text-gray-800 flex items-baseline gap-1.5">
                    Luna, <span class="text-lg font-semibold text-gray-400">3</span>
                </h1>
                <div class="flex flex-wrap gap-1.5 mt-1.5">
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[11px] font-bold">
                        <i data-lucide="dog" class="w-3 h-3"></i> Golden Retriever
                    </span>
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[11px] font-bold">
                        <i data-lucide="ruler" class="w-3 h-3"></i> Large
                    </span>
                </div>
            </div>
        </div>

        <!-- Bio -->
        <p class="text-gray-500 text-[13px] leading-relaxed font-medium px-1 mb-5">
            "Loves belly rubs, stealing socks, and pretending she didn't eat the couch cushion. Looking for a partner in crime who can keep up at the park. No cats please. 🐾"
        </p>

        <!-- Stories Section Header -->
        <div class="flex items-center gap-2 mb-4 px-1">
            <div class="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center">
                <i data-lucide="book-open" class="w-3.5 h-3.5 text-orange-500"></i>
            </div>
            <div>
                <h2 class="text-sm font-extrabold text-gray-800 leading-tight">Luna's Stories</h2>
                <p class="text-[11px] text-gray-400 font-medium">Tap the photos to see what happened</p>
            </div>
        </div>

        <!-- Stories Container -->
        <div id="stories-container" class="flex flex-col gap-4 mb-5"></div>

        <!-- Action Buttons -->
        <div class="flex justify-center gap-6 border-t border-gray-100 pt-5">
            <button class="action-btn w-14 h-14 rounded-full bg-white border-2 border-red-100 text-red-400 flex items-center justify-center shadow-sm hover:bg-red-50 focus:outline-none">
                <i data-lucide="x" class="w-7 h-7 stroke-[3]"></i>
            </button>
            <button class="action-btn w-14 h-14 rounded-full bg-white border-2 border-green-100 text-green-400 flex items-center justify-center shadow-sm hover:bg-green-50 focus:outline-none">
                <i data-lucide="heart" class="w-7 h-7 stroke-[3] fill-current"></i>
            </button>
        </div>

    </main>

    <script>
        lucide.createIcons();

        var SERVER = 'http://localhost:3001';

        var stories = [
            {
                id: 'bee',
                emoji: '🐝',
                title: 'The Bee Incident',
                text: 'Tried to eat a bee at the park. Spent the rest of the day looking like a furry balloon with the puffiest cheeks you have ever seen.',
                prompt: 'A Golden Retriever with extremely swollen puffy cheeks from a bee sting, looking confused and adorable, sitting in a sunny park, funny portrait photo, soft warm lighting',
                color: 'amber',
                img: null,
                loading: false
            },
            {
                id: 'sock',
                emoji: '🧦',
                title: 'The Sock Mystery',
                text: 'Swallowed an entire long sock. The vet said it was impressive. Mom did not agree. 3 hours and one X-ray later, all good.',
                prompt: 'A Golden Retriever at the veterinarian office wearing a cone of shame, looking guilty with a sock visible on an X-ray screen behind, humorous vet visit portrait, bright clinical lighting',
                color: 'blue',
                img: null,
                loading: false
            },
            {
                id: 'surf',
                emoji: '🏄',
                title: 'Surf Queen',
                text: 'First time at the beach, jumped on a surfboard and just... stayed. Natural talent. Basically a pro now.',
                prompt: 'A Golden Retriever standing proudly on a surfboard riding a small wave at the beach, wearing tiny sunglasses, action shot with sparkling ocean water, golden hour lighting',
                color: 'emerald',
                img: null,
                loading: false
            }
        ];

        var colorMap = {
            amber:   { bg: 'bg-amber-50',   border: 'border-amber-100',  text: 'text-amber-700',   light: 'text-amber-400' },
            blue:    { bg: 'bg-blue-50',     border: 'border-blue-100',   text: 'text-blue-700',    light: 'text-blue-400' },
            emerald: { bg: 'bg-emerald-50',  border: 'border-emerald-100', text: 'text-emerald-700', light: 'text-emerald-400' }
        };

        function generateImage(story) {
            if (story.loading || story.img) return;
            story.loading = true;
            renderStories();

            fetch(SERVER + '/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: story.prompt })
            })
            .then(function(res) {
                if (!res.ok) throw new Error('Server error: ' + res.status);
                return res.json();
            })
            .then(function(data) {
                story.img = 'data:' + (data.mimeType || 'image/png') + ';base64,' + data.image;
            })
            .catch(function(err) {
                console.error('Failed to generate image for', story.title, err);
                story.img = 'error';
            })
            .finally(function() {
                story.loading = false;
                renderStories();
            });
        }

        function renderStories() {
            var container = document.getElementById('stories-container');
            container.innerHTML = '';

            stories.forEach(function(story, index) {
                var c = colorMap[story.color];
                var isReversed = index % 2 === 1;

                var card = document.createElement('div');
                card.className = c.bg + ' rounded-2xl overflow-hidden border ' + c.border;

                // Build image element
                var imgHtml = '';
                if (story.img && story.img !== 'error') {
                    imgHtml = '<div class="story-img w-full h-full">' +
                        '<img src="' + story.img + '" class="w-full h-full object-cover" alt="' + story.title + '">' +
                        '</div>';
                } else if (story.loading) {
                    imgHtml = '<div class="generating w-full h-full flex flex-col items-center justify-center">' +
                        '<i data-lucide="sparkles" class="w-6 h-6 text-amber-500 mb-1.5"></i>' +
                        '<span class="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Generating...</span>' +
                        '</div>';
                } else if (story.img === 'error') {
                    imgHtml = '<div class="w-full h-full flex flex-col items-center justify-center bg-red-50">' +
                        '<i data-lucide="alert-circle" class="w-5 h-5 text-red-300 mb-1"></i>' +
                        '<span class="text-[10px] font-bold text-red-400">Failed</span>' +
                        '</div>';
                } else {
                    imgHtml = '<div class="mystery-img w-full h-full flex flex-col items-center justify-center" onclick="generateImage(stories[' + index + '])">' +
                        '<span class="text-3xl mb-1.5 drop-shadow-sm">' + story.emoji + '</span>' +
                        '<span class="text-[10px] font-bold text-white uppercase tracking-wider drop-shadow-sm">Tap to reveal</span>' +
                        '</div>';
                }

                // Build the two-column layout
                var textSide = '<div class="flex-1 p-4 flex flex-col justify-center">' +
                    '<div class="flex items-center gap-1.5 mb-1.5">' +
                        '<span class="text-base leading-none">' + story.emoji + '</span>' +
                        '<h3 class="text-sm font-extrabold ' + c.text + '">' + story.title + '</h3>' +
                    '</div>' +
                    '<p class="text-xs text-gray-600 leading-relaxed font-medium">' + story.text + '</p>' +
                    '</div>';

                var imageSide = '<div class="w-[140px] shrink-0 min-h-[140px]">' + imgHtml + '</div>';

                if (isReversed) {
                    card.innerHTML = '<div class="flex flex-row">' + imageSide + textSide + '</div>';
                } else {
                    card.innerHTML = '<div class="flex flex-row">' + textSide + imageSide + '</div>';
                }

                container.appendChild(card);
            });

            lucide.createIcons();
        }

        renderStories();
    <\/script>
</body>
</html>`;

export const comments: Comment[] = [];

export const metadata = {
  id: 'pm_branch_fact_portraits',
  name: 'fact-portraits',
  description: 'Merged branch: visual story blog with fun facts and AI-generated portraits on tap.',
  status: 'active' as const,
  color: '#F59E0B',
  collaborators: [lucas],
  tags: ['ai-portraits', 'fun-facts', 'stories', 'gemini', 'merged'],
};
