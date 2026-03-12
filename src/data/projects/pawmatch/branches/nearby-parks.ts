import type { Comment } from '@/types/branch';
import { lucas } from '../collaborators';

export const code = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PawMatch - Luna's Profile</title>
    <!-- Tailwind CSS for styling -->
    <script src="https://cdn.tailwindcss.com"><\/script>
    <!-- Lucide Icons for cute UI elements -->
    <script src="https://unpkg.com/lucide@latest"><\/script>
    <!-- Google Fonts: Nunito for a playful, rounded look -->
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">

    <style>
        body {
            font-family: 'Nunito', sans-serif;
            /* Soft light peach background */
            background-color: #FFF2EB;
        }
        .card-shadow {
            /* Warm, subtle shadow to match the background */
            box-shadow: 0 20px 40px -15px rgba(251, 146, 60, 0.2);
        }
        /* Smooth hover animations for the swipe buttons */
        .action-btn {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .action-btn:hover {
            transform: scale(1.1);
        }
        .action-btn:active {
            transform: scale(0.95);
        }

        /* Custom scrollbar for the park list */
        .scrollbar-thin::-webkit-scrollbar {
            width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
            background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
            background-color: #FFEDD5;
            border-radius: 20px;
        }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center py-8 px-4 selection:bg-orange-200">

    <!-- Main Centered Profile Card -->
    <main class="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-[380px] w-full card-shadow relative">

        <!-- Circular Profile Photo -->
        <div class="relative w-44 h-44 mx-auto mb-6">
            <img
                src="https://images.unsplash.com/photo-1552053831-71594a27632d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
                alt="Luna the Golden Retriever"
                class="w-full h-full object-cover rounded-full border-[6px] border-orange-50 shadow-sm"
            >
            <!-- Online status dot -->
            <div class="absolute bottom-3 right-3 w-6 h-6 bg-green-400 border-4 border-white rounded-full"></div>
        </div>

        <!-- Dog's Info Container -->
        <div class="text-center">

            <!-- Name & Age -->
            <h1 class="text-3xl font-extrabold text-gray-800 flex items-baseline justify-center gap-2 mb-3">
                Luna, <span class="text-2xl font-semibold text-gray-500">3</span>
            </h1>

            <!-- Badges for Breed and Size -->
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

            <!-- Dating Bio -->
            <div class="relative mb-6">
                <p class="text-gray-600 leading-relaxed text-[15px] font-medium px-2">
                    "Loves belly rubs, stealing socks, and pretending she didn't eat the couch cushion. Looking for a partner in crime who can keep up at the park. No cats please. 🐾"
                </p>
            </div>

            <!-- Date Planner Section -->
            <div class="text-left mb-2">
                <div class="flex items-center gap-2 px-2 mb-3">
                    <div class="bg-orange-100 p-1.5 rounded-lg text-orange-600">
                        <i data-lucide="map" class="w-4 h-4"></i>
                    </div>
                    <h2 class="text-[16px] font-extrabold text-gray-800">Nearby Dog Parks</h2>
                </div>

                <!-- Placeholder Map -->
                <div class="relative w-full h-32 bg-green-50 rounded-[1.25rem] border-2 border-green-100 mb-4 overflow-hidden shadow-inner">
                    <!-- Decorative Map Elements -->
                    <div class="absolute inset-0 opacity-40">
                        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="20" cy="70" r="25" fill="#DCFCE7" />
                            <circle cx="85" cy="25" r="30" fill="#DCFCE7" />
                            <path d="M-10,50 Q40,20 100,60 T250,40" stroke="#86EFAC" stroke-width="3" fill="none" stroke-linecap="round" />
                            <path d="M50,-10 Q80,60 40,150" stroke="#86EFAC" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="4 4"/>
                        </svg>
                    </div>
                    <!-- Pins -->
                    <div class="absolute top-4 left-10 text-orange-500 drop-shadow-md animate-bounce" style="animation-duration: 2s;">
                        <i data-lucide="map-pin" class="w-6 h-6 fill-orange-100"></i>
                    </div>
                    <div class="absolute top-12 right-12 text-orange-500 drop-shadow-md scale-90">
                        <i data-lucide="map-pin" class="w-6 h-6 fill-orange-100"></i>
                    </div>
                    <div class="absolute bottom-4 left-1/3 text-orange-500 drop-shadow-md scale-75 opacity-90">
                        <i data-lucide="map-pin" class="w-6 h-6 fill-orange-100"></i>
                    </div>
                    <div class="absolute bottom-6 right-8 text-orange-500 drop-shadow-md scale-75 opacity-70">
                        <i data-lucide="map-pin" class="w-6 h-6 fill-orange-100"></i>
                    </div>
                </div>

                <!-- Scrollable Park List -->
                <div class="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1 pb-2 scrollbar-thin">
                    <!-- Park 1 -->
                    <div class="bg-white border-2 border-orange-50/50 p-3 rounded-2xl shadow-[0_4px_10px_-6px_rgba(0,0,0,0.1)] hover:border-orange-200 transition-all group">
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="font-bold text-gray-800 text-[14px] leading-tight group-hover:text-orange-600 transition-colors">Trinity Bellwoods</h3>
                            <span class="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md whitespace-nowrap">0.3 km</span>
                        </div>
                        <div class="flex justify-between items-end mt-1">
                            <div class="flex flex-col gap-1.5">
                                <span class="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider">4 dogs here</span>
                                <div class="flex -space-x-2">
                                    <img src="https://images.unsplash.com/photo-1517849845537-4d257902454a?w=100&h=100&fit=crop" class="w-6 h-6 rounded-full border-2 border-white object-cover shadow-sm" alt="Dog">
                                    <img src="https://images.unsplash.com/photo-1537151608804-ea2f1cb765cd?w=100&h=100&fit=crop" class="w-6 h-6 rounded-full border-2 border-white object-cover shadow-sm" alt="Dog">
                                    <img src="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=100&h=100&fit=crop" class="w-6 h-6 rounded-full border-2 border-white object-cover shadow-sm" alt="Dog">
                                    <div class="w-6 h-6 rounded-full border-2 border-white bg-gray-50 flex items-center justify-center text-[8px] font-bold text-gray-500 shadow-sm z-10">+1</div>
                                </div>
                            </div>
                            <button class="bg-orange-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl hover:bg-orange-600 hover:-translate-y-0.5 transition-all shadow-sm">
                                Meet here!
                            </button>
                        </div>
                    </div>

                    <!-- Park 2 -->
                    <div class="bg-white border-2 border-orange-50/50 p-3 rounded-2xl shadow-[0_4px_10px_-6px_rgba(0,0,0,0.1)] hover:border-orange-200 transition-all group">
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="font-bold text-gray-800 text-[14px] leading-tight group-hover:text-orange-600 transition-colors">High Park</h3>
                            <span class="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-md whitespace-nowrap">1.2 km</span>
                        </div>
                        <div class="flex justify-between items-end mt-1">
                            <div class="flex flex-col gap-1.5">
                                <span class="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider">12 dogs here</span>
                                <div class="flex -space-x-2">
                                    <img src="https://images.unsplash.com/photo-1544568100-847a948585b9?w=100&h=100&fit=crop" class="w-6 h-6 rounded-full border-2 border-white object-cover shadow-sm" alt="Dog">
                                    <img src="https://images.unsplash.com/photo-1552053831-71594a27632d?w=100&h=100&fit=crop" class="w-6 h-6 rounded-full border-2 border-white object-cover shadow-sm" alt="Dog">
                                    <div class="w-6 h-6 rounded-full border-2 border-white bg-gray-50 flex items-center justify-center text-[8px] font-bold text-gray-500 shadow-sm z-10">+10</div>
                                </div>
                            </div>
                            <button class="bg-orange-100 text-orange-600 text-[11px] font-bold px-3 py-1.5 rounded-xl hover:bg-orange-200 hover:-translate-y-0.5 transition-all">
                                Meet here!
                            </button>
                        </div>
                    </div>

                    <!-- Park 3 -->
                    <div class="bg-white border-2 border-orange-50/50 p-3 rounded-2xl shadow-[0_4px_10px_-6px_rgba(0,0,0,0.1)] hover:border-orange-200 transition-all group">
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="font-bold text-gray-800 text-[14px] leading-tight group-hover:text-orange-600 transition-colors">Stanley Park</h3>
                            <span class="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-md whitespace-nowrap">2.5 km</span>
                        </div>
                        <div class="flex justify-between items-end mt-1">
                            <div class="flex flex-col gap-1.5">
                                <span class="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider">2 dogs here</span>
                                <div class="flex -space-x-2">
                                    <img src="https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=100&h=100&fit=crop" class="w-6 h-6 rounded-full border-2 border-white object-cover shadow-sm" alt="Dog">
                                    <img src="https://images.unsplash.com/photo-1510771463146-e89e6e86560e?w=100&h=100&fit=crop" class="w-6 h-6 rounded-full border-2 border-white object-cover shadow-sm" alt="Dog">
                                </div>
                            </div>
                            <button class="bg-orange-100 text-orange-600 text-[11px] font-bold px-3 py-1.5 rounded-xl hover:bg-orange-200 hover:-translate-y-0.5 transition-all">
                                Meet here!
                            </button>
                        </div>
                    </div>

                    <!-- Park 4 -->
                    <div class="bg-white border-2 border-orange-50/50 p-3 rounded-2xl shadow-[0_4px_10px_-6px_rgba(0,0,0,0.1)] hover:border-orange-200 transition-all group">
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="font-bold text-gray-800 text-[14px] leading-tight group-hover:text-orange-600 transition-colors">Riverdale Park</h3>
                            <span class="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-md whitespace-nowrap">3.0 km</span>
                        </div>
                        <div class="flex justify-between items-end mt-1">
                            <div class="flex flex-col gap-1.5">
                                <span class="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider">7 dogs here</span>
                                <div class="flex -space-x-2">
                                    <img src="https://images.unsplash.com/photo-1558788353-f76d92427f16?w=100&h=100&fit=crop" class="w-6 h-6 rounded-full border-2 border-white object-cover shadow-sm" alt="Dog">
                                    <img src="https://images.unsplash.com/photo-1593134257782-e89567b7718a?w=100&h=100&fit=crop" class="w-6 h-6 rounded-full border-2 border-white object-cover shadow-sm" alt="Dog">
                                    <div class="w-6 h-6 rounded-full border-2 border-white bg-gray-50 flex items-center justify-center text-[8px] font-bold text-gray-500 shadow-sm z-10">+5</div>
                                </div>
                            </div>
                            <button class="bg-orange-100 text-orange-600 text-[11px] font-bold px-3 py-1.5 rounded-xl hover:bg-orange-200 hover:-translate-y-0.5 transition-all">
                                Meet here!
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <!-- Swipe Action Buttons (Pass / Play) -->
        <div class="flex justify-center gap-6 mt-4 border-t border-gray-100 pt-6">
            <!-- Pass Button -->
            <button class="action-btn w-16 h-16 rounded-full bg-white border-2 border-red-100 text-red-400 flex items-center justify-center shadow-sm hover:bg-red-50 hover:text-red-500 hover:border-red-200 focus:outline-none">
                <i data-lucide="x" class="w-8 h-8 stroke-[3]"></i>
            </button>

            <!-- Match/Play Button -->
            <button class="action-btn w-16 h-16 rounded-full bg-white border-2 border-green-100 text-green-400 flex items-center justify-center shadow-sm hover:bg-green-50 hover:text-green-500 hover:border-green-200 focus:outline-none">
                <i data-lucide="heart" class="w-8 h-8 stroke-[3] fill-current"></i>
            </button>
        </div>

    </main>

    <!-- Initialize Icons -->
    <script>
        lucide.createIcons();
    <\/script>
</body>
</html>`;

export const comments: Comment[] = [];

export const metadata = {
  id: 'pm_branch_parks',
  name: 'nearby-parks',
  description: 'Adds nearby dog parks section with map placeholder, park list, and "Meet here" CTAs.',
  status: 'active' as const,
  color: '#06B6D4',
  collaborators: [lucas],
  tags: ['location', 'parks', 'social'],
};
