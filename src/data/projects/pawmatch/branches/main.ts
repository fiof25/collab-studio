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
    </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4 selection:bg-orange-200">

    <!-- Main Centered Profile Card -->
    <main class="bg-white rounded-[2.5rem] p-8 max-w-[360px] w-full card-shadow relative">

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
            <div class="relative mb-8">
                <p class="text-gray-600 leading-relaxed text-[15px] font-medium px-2">
                    "Loves belly rubs, stealing socks, and pretending she didn't eat the couch cushion. Looking for a partner in crime who can keep up at the park. No cats please. 🐾"
                </p>
            </div>

        </div>

        <!-- Swipe Action Buttons (Pass / Play) -->
        <div class="flex justify-center gap-6 mt-2 border-t border-gray-100 pt-6">
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
  id: 'pm_branch_root',
  name: 'main',
  description: 'Profile card UI — circular photo, badges, swipe buttons on peach background.',
  status: 'active' as const,
  color: '#F97316',
  collaborators: [lucas],
  tags: ['baseline', 'profile-card'],
};
