import type { Comment } from '@/types/branch';
import { lucas } from '../collaborators';

export const code = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PawMatch - Luna's Profile</title>
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
        .action-btn:hover {
            transform: scale(1.1);
        }
        .action-btn:active {
            transform: scale(0.95);
        }
        .no-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4 selection:bg-orange-200">

    <main class="bg-white rounded-[2.5rem] p-8 max-w-[400px] w-full card-shadow relative">

        <div class="relative w-44 h-44 mx-auto mb-6">
            <img
                src="https://images.unsplash.com/photo-1552053831-71594a27632d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
                alt="Luna the Golden Retriever"
                class="w-full h-full object-cover rounded-full border-[6px] border-orange-50 shadow-sm"
            >
            <div class="absolute bottom-3 right-3 w-6 h-6 bg-green-400 border-4 border-white rounded-full"></div>
        </div>

        <div class="text-center">

            <h1 class="text-3xl font-extrabold text-gray-800 flex items-baseline justify-center gap-2 mb-3">
                Luna, <span class="text-2xl font-semibold text-gray-500">3</span>
            </h1>

            <div class="flex flex-wrap justify-center gap-2 mb-6">
                <span class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-100 text-orange-700 text-sm font-bold">
                    <i data-lucide="dog" class="w-4 h-4"></i>
                    Golden Retriever
                </span>
                <span class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-600 text-sm font-bold">
                    <i data-lucide="ruler" class="w-4 h-4"></i>
                    Large Size
                </span>
            </div>

            <div class="relative mb-6">
                <p class="text-gray-600 leading-relaxed text-[15px] font-medium px-2">
                    "Loves belly rubs, stealing socks, and pretending she didn't eat the couch cushion. Looking for a partner in crime who can keep up at the park. No cats please. 🐾"
                </p>
            </div>

            <div class="mb-6">
                <h2 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 text-left pl-2">Personality Traits</h2>
                <div id="chips-container" class="flex flex-wrap gap-2 justify-center"></div>
            </div>

            <div id="portraits-section" class="mb-2 hidden">
                <h2 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 text-left pl-2">AI Portraits</h2>
                <div id="gallery-container" class="flex overflow-x-auto gap-3 pb-4 pt-1 snap-x snap-mandatory no-scrollbar -mx-4 px-4"></div>
            </div>

        </div>

        <div class="flex justify-center gap-6 mt-2 border-t border-gray-100 pt-6">
            <button class="action-btn w-16 h-16 rounded-full bg-white border-2 border-red-100 text-red-400 flex items-center justify-center shadow-sm hover:bg-red-50 hover:text-red-500 hover:border-red-200 focus:outline-none">
                <i data-lucide="x" class="w-8 h-8 stroke-[3]"></i>
            </button>
            <button class="action-btn w-16 h-16 rounded-full bg-white border-2 border-green-100 text-green-400 flex items-center justify-center shadow-sm hover:bg-green-50 hover:text-green-500 hover:border-green-200 focus:outline-none">
                <i data-lucide="heart" class="w-8 h-8 stroke-[3] fill-current"></i>
            </button>
        </div>

    </main>

    <script>
        lucide.createIcons();

        var SERVER = 'http://localhost:3001';

        var traitsData = [
            { id: 'cook', emoji: '👨‍🍳', label: 'Good Cook', caption: 'Chef Luna flipping pancakes at 3 AM', img: null, loading: false },
            { id: 'athlete', emoji: '⚾', label: 'Athlete', caption: 'Catching the uncatchable tennis ball', img: null, loading: false },
            { id: 'fashion', emoji: '🕶️', label: 'Fashionista', caption: 'Ready for the Paris dog-walk', img: null, loading: false },
            { id: 'agent', emoji: '🕵️', label: 'Secret Agent', caption: 'Agent Luna on a top-secret belly rub mission', img: null, loading: false },
            { id: 'potato', emoji: '🛋️', label: 'Couch Potato', caption: 'Mastering the art of the 14-hour nap', img: null, loading: false },
            { id: 'party', emoji: '🎉', label: 'Party Animal', caption: 'First to the treat jar, last to leave', img: null, loading: false }
        ];

        var selectedTraits = new Set();

        function generateImage(trait) {
            if (trait.loading || trait.img) return;
            trait.loading = true;
            renderGallery();

            var prompt = 'A funny, cute, high-quality portrait of a Golden Retriever dog. Theme: ' + trait.label + '. Scene: ' + trait.caption + '. Playful dating profile photo style, well-lit, expressive.';

            fetch(SERVER + '/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt })
            })
            .then(function(res) {
                if (!res.ok) throw new Error('Server error: ' + res.status);
                return res.json();
            })
            .then(function(data) {
                trait.img = 'data:' + (data.mimeType || 'image/png') + ';base64,' + data.image;
            })
            .catch(function(err) {
                console.error('Failed to generate image for', trait.label, err);
                trait.img = 'error';
            })
            .finally(function() {
                trait.loading = false;
                renderGallery();
            });
        }

        function renderChips() {
            var container = document.getElementById('chips-container');
            container.innerHTML = '';

            traitsData.forEach(function(trait) {
                var isSelected = selectedTraits.has(trait.id);
                var btn = document.createElement('button');
                btn.className = 'px-3.5 py-1.5 rounded-full text-sm font-bold transition-all duration-200 border-2 cursor-pointer flex items-center gap-1.5 ' +
                    (isSelected
                        ? 'bg-orange-500 text-white border-orange-500 shadow-md transform scale-105'
                        : 'bg-white text-gray-500 border-gray-100 hover:border-orange-300 hover:text-orange-400 hover:bg-orange-50');
                btn.innerHTML = '<span>' + trait.emoji + '</span> ' + trait.label;
                btn.onclick = function() { toggleTrait(trait.id); };
                container.appendChild(btn);
            });
        }

        function renderGallery() {
            var section = document.getElementById('portraits-section');
            var container = document.getElementById('gallery-container');
            container.innerHTML = '';

            if (selectedTraits.size === 0) {
                section.classList.add('hidden');
                return;
            }

            section.classList.remove('hidden');

            traitsData.filter(function(t) { return selectedTraits.has(t.id); }).forEach(function(trait) {
                var card = document.createElement('div');
                card.className = 'shrink-0 w-44 snap-center bg-white rounded-2xl overflow-hidden shadow-sm border border-orange-100 flex flex-col transition-all hover:shadow-md relative';

                var imageContent = '';
                if (trait.img && trait.img !== 'error') {
                    imageContent = '<img src="' + trait.img + '" class="w-full h-full object-cover" alt="' + trait.label + '">';
                } else if (trait.img === 'error') {
                    imageContent = '<div class="w-full h-full flex flex-col items-center justify-center bg-red-50/50">' +
                        '<i data-lucide="alert-circle" class="w-6 h-6 text-red-300 mb-1"></i>' +
                        '<span class="text-[10px] font-bold text-red-400">Failed</span>' +
                        '</div>';
                } else {
                    imageContent = '<div class="w-full h-full flex flex-col items-center justify-center bg-orange-50/50">' +
                        '<i data-lucide="sparkles" class="w-6 h-6 text-orange-400 animate-pulse mb-2"></i>' +
                        '<span class="text-[10px] font-bold text-orange-400 uppercase tracking-widest animate-pulse">Generating</span>' +
                        '</div>';
                }

                card.innerHTML = '<div class="h-32 bg-orange-50 relative overflow-hidden">' +
                    imageContent +
                    '<div class="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-bold text-gray-700 shadow-sm flex items-center gap-1">' +
                        '<span>' + trait.emoji + '</span> ' + trait.label +
                    '</div>' +
                    '</div>' +
                    '<div class="p-3 flex-1 flex items-center justify-center bg-gradient-to-b from-white to-orange-50/30">' +
                        '<p class="text-xs text-gray-600 font-semibold leading-relaxed text-center italic">"' + trait.caption + '"</p>' +
                    '</div>';
                container.appendChild(card);
            });

            lucide.createIcons();
        }

        function toggleTrait(id) {
            var trait = traitsData.find(function(t) { return t.id === id; });
            if (selectedTraits.has(id)) {
                selectedTraits.delete(id);
            } else {
                selectedTraits.add(id);
                if (trait && !trait.img) generateImage(trait);
            }
            renderChips();
            renderGallery();
        }

        renderChips();
        renderGallery();
    <\/script>
</body>
</html>`;

export const comments: Comment[] = [];

export const metadata = {
  id: 'pm_branch_traits',
  name: 'traits-and-portraits',
  description: 'Adds personality trait chips and AI-generated portrait gallery via Gemini image generation.',
  status: 'active' as const,
  color: '#A855F7',
  collaborators: [lucas],
  tags: ['ai-portraits', 'traits', 'gemini'],
};
