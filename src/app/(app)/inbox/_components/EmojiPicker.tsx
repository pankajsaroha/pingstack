'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Smile, ThumbsUp, Heart, Sparkles, Coffee } from 'lucide-react';

interface EmojiItem {
  emoji: string;
  name: string;
  keywords: string[];
}

interface EmojiCategory {
  id: string;
  name: string;
  icon: typeof Smile;
  emojis: EmojiItem[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    name: 'Smileys',
    icon: Smile,
    emojis: [
      { emoji: '😀', name: 'Grinning Face', keywords: ['happy', 'smile', 'joy'] },
      { emoji: '😃', name: 'Grinning Face with Big Eyes', keywords: ['happy', 'smile', 'joy'] },
      { emoji: '😄', name: 'Grinning Face with Smiling Eyes', keywords: ['happy', 'laugh'] },
      { emoji: '😁', name: 'Beaming Face', keywords: ['grin', 'smile'] },
      { emoji: '😆', name: 'Grinning Squinting Face', keywords: ['laugh', 'lol'] },
      { emoji: '😅', name: 'Grinning Face with Sweat', keywords: ['relief', 'sweat'] },
      { emoji: '🤣', name: 'Rolling on the Floor Laughing', keywords: ['rofl', 'lol', 'laugh'] },
      { emoji: '😂', name: 'Face with Tears of Joy', keywords: ['joy', 'laugh', 'crying'] },
      { emoji: '🙂', name: 'Slightly Smiling Face', keywords: ['smile', 'calm'] },
      { emoji: '😉', name: 'Winking Face', keywords: ['wink', 'flirt'] },
      { emoji: '😊', name: 'Smiling Face with Smiling Eyes', keywords: ['blush', 'proud'] },
      { emoji: '😇', name: 'Smiling Face with Halo', keywords: ['angel', 'innocent'] },
      { emoji: '🥰', name: 'Smiling Face with Hearts', keywords: ['love', 'crush'] },
      { emoji: '😍', name: 'Heart Eyes', keywords: ['love', 'adore'] },
      { emoji: '🤩', name: 'Star-Struck', keywords: ['excited', 'star'] },
      { emoji: '😘', name: 'Face Blowing a Kiss', keywords: ['kiss', 'love'] },
      { emoji: '😗', name: 'Kissing Face', keywords: ['kiss'] },
      { emoji: '😚', name: 'Kissing Face with Closed Eyes', keywords: ['kiss'] },
      { emoji: '😋', name: 'Face Savoring Food', keywords: ['yummy', 'delicious'] },
      { emoji: '😛', name: 'Face with Tongue', keywords: ['tongue', 'playful'] },
      { emoji: '😜', name: 'Winking Face with Tongue', keywords: ['crazy', 'playful'] },
      { emoji: '🤪', name: 'Zany Face', keywords: ['crazy', 'wild'] },
      { emoji: '😝', name: 'Squinting Face with Tongue', keywords: ['playful'] },
      { emoji: '🤑', name: 'Money-Mouth Face', keywords: ['money', 'rich', 'cash'] },
      { emoji: '🤗', name: 'Hugging Face', keywords: ['hug', 'warm'] },
      { emoji: '🤫', name: 'Shushing Face', keywords: ['quiet', 'secret'] },
      { emoji: '🤔', name: 'Thinking Face', keywords: ['think', 'ponder'] },
      { emoji: '🤐', name: 'Zipper-Mouth Face', keywords: ['silent', 'secret'] },
      { emoji: '🤨', name: 'Face with Raised Eyebrow', keywords: ['skeptical', 'doubt'] },
      { emoji: '😐', name: 'Neutral Face', keywords: ['neutral', 'meh'] },
      { emoji: '😑', name: 'Expressionless Face', keywords: ['blank'] },
      { emoji: '😶', name: 'Face Without Mouth', keywords: ['silent'] },
      { emoji: '😏', name: 'Smirking Face', keywords: ['smirk', 'cool'] },
      { emoji: '😒', name: 'Unamused Face', keywords: ['bored', 'annoyed'] },
      { emoji: '🙄', name: 'Face with Rolling Eyes', keywords: ['eyeroll'] },
      { emoji: '😬', name: 'Grimacing Face', keywords: ['awkward', 'nervous'] },
      { emoji: '🤥', name: 'Lying Face', keywords: ['lie', 'pinocchio'] },
      { emoji: '😌', name: 'Relieved Face', keywords: ['relieved', 'peace'] },
      { emoji: '😔', name: 'Pensive Face', keywords: ['sad', 'depressed'] },
      { emoji: '😪', name: 'Sleepy Face', keywords: ['tired', 'sleepy'] },
      { emoji: '🤤', name: 'Drooling Face', keywords: ['drool'] },
      { emoji: '😴', name: 'Sleeping Face', keywords: ['zzz', 'sleep'] },
      { emoji: '😷', name: 'Face with Medical Mask', keywords: ['mask', 'sick'] },
      { emoji: '🤒', name: 'Face with Thermometer', keywords: ['fever', 'sick'] },
      { emoji: '🤕', name: 'Face with Head-Bandage', keywords: ['hurt', 'injury'] },
      { emoji: '🤢', name: 'Nauseated Face', keywords: ['gross', 'sick'] },
      { emoji: '🤮', name: 'Face Vomiting', keywords: ['puke', 'sick'] },
      { emoji: '🤧', name: 'Sneezing Face', keywords: ['sneeze', 'cold'] },
      { emoji: '🥵', name: 'Hot Face', keywords: ['hot', 'heat'] },
      { emoji: '🥶', name: 'Cold Face', keywords: ['cold', 'freeze'] },
      { emoji: '🥴', name: 'Woozy Face', keywords: ['dizzy', 'drunk'] },
      { emoji: '😵', name: 'Dizzy Face', keywords: ['dizzy'] },
      { emoji: '🤯', name: 'Exploding Head', keywords: ['mindblown', 'shock'] },
      { emoji: '🤠', name: 'Cowboy Hat Face', keywords: ['cowboy'] },
      { emoji: '🥳', name: 'Partying Face', keywords: ['party', 'celebrate'] },
      { emoji: '😎', name: 'Smiling Face with Sunglasses', keywords: ['cool', 'sun'] },
      { emoji: '🤓', name: 'Nerd Face', keywords: ['nerd', 'geek'] },
      { emoji: '🧐', name: 'Face with Monocle', keywords: ['classy', 'smart'] },
      { emoji: '😕', name: 'Confused Face', keywords: ['confused'] },
      { emoji: '😟', name: 'Worried Face', keywords: ['worried'] },
      { emoji: '🙁', name: 'Slightly Frowning Face', keywords: ['sad'] },
      { emoji: '😮', name: 'Face with Open Mouth', keywords: ['wow', 'surprise'] },
      { emoji: '😲', name: 'Astonished Face', keywords: ['shock', 'amazed'] },
      { emoji: '😳', name: 'Flushed Face', keywords: ['blush', 'shy'] },
      { emoji: '🥺', name: 'Pleading Face', keywords: ['beg', 'cute', 'puppy'] },
      { emoji: '😦', name: 'Frowning Face with Open Mouth', keywords: ['sad'] },
      { emoji: '😨', name: 'Fearful Face', keywords: ['scared', 'fear'] },
      { emoji: '😰', name: 'Anxious Face with Sweat', keywords: ['nervous'] },
      { emoji: '😥', name: 'Sad but Relieved Face', keywords: ['phew'] },
      { emoji: '😢', name: 'Crying Face', keywords: ['tear', 'sad'] },
      { emoji: '😭', name: 'Loudly Crying Face', keywords: ['sob', 'tears', 'crying'] },
      { emoji: '😱', name: 'Face Screaming in Fear', keywords: ['scream', 'scared'] },
      { emoji: '😖', name: 'Confounded Face', keywords: ['frustrated'] },
      { emoji: '😣', name: 'Persevering Face', keywords: ['struggle'] },
      { emoji: '😞', name: 'Disappointed Face', keywords: ['disappointed'] },
      { emoji: '😓', name: 'Downcast Face with Sweat', keywords: ['stress'] },
      { emoji: '😩', name: 'Weary Face', keywords: ['tired'] },
      { emoji: '😫', name: 'Tired Face', keywords: ['exhausted'] },
      { emoji: '🥱', name: 'Yawning Face', keywords: ['yawn', 'bored'] },
      { emoji: '😤', name: 'Face with Steam From Nose', keywords: ['triumph', 'proud'] },
      { emoji: '😡', name: 'Enraged Face', keywords: ['angry', 'mad', 'rage'] },
      { emoji: '😠', name: 'Angry Face', keywords: ['angry', 'mad'] },
      { emoji: '🤬', name: 'Face with Symbols on Mouth', keywords: ['curse', 'swear'] }
    ]
  },
  {
    id: 'gestures',
    name: 'Gestures & People',
    icon: ThumbsUp,
    emojis: [
      { emoji: '👋', name: 'Waving Hand', keywords: ['hello', 'bye', 'wave'] },
      { emoji: '🤚', name: 'Raised Back of Hand', keywords: ['hand', 'stop'] },
      { emoji: '🖐️', name: 'Hand with Fingers Splayed', keywords: ['hand', 'five'] },
      { emoji: '✋', name: 'Raised Hand', keywords: ['highfive', 'stop'] },
      { emoji: '🖖', name: 'Vulcan Salute', keywords: ['spock', 'live long'] },
      { emoji: '👌', name: 'OK Hand', keywords: ['ok', 'perfect', 'good'] },
      { emoji: '🤌', name: 'Pinched Fingers', keywords: ['italian', 'chef'] },
      { emoji: '🤏', name: 'Pinching Hand', keywords: ['little', 'small'] },
      { emoji: '✌️', name: 'Victory Hand', keywords: ['peace', 'victory'] },
      { emoji: '🤞', name: 'Crossed Fingers', keywords: ['luck', 'hope'] },
      { emoji: '🤟', name: 'Love-You Gesture', keywords: ['love', 'rock'] },
      { emoji: '🤘', name: 'Sign of the Horns', keywords: ['rock', 'metal'] },
      { emoji: '🤙', name: 'Call Me Hand', keywords: ['call', 'phone'] },
      { emoji: '👈', name: 'Backhand Index Pointing Left', keywords: ['point', 'left'] },
      { emoji: '👉', name: 'Backhand Index Pointing Right', keywords: ['point', 'right'] },
      { emoji: '👆', name: 'Backhand Index Pointing Up', keywords: ['point', 'up'] },
      { emoji: '👇', name: 'Backhand Index Pointing Down', keywords: ['point', 'down'] },
      { emoji: '☝️', name: 'Index Pointing Up', keywords: ['one', 'up'] },
      { emoji: '👍', name: 'Thumbs Up', keywords: ['like', 'approve', 'yes', 'ok'] },
      { emoji: '👎', name: 'Thumbs Down', keywords: ['dislike', 'no'] },
      { emoji: '✊', name: 'Raised Fist', keywords: ['power', 'fist'] },
      { emoji: '👊', name: 'Oncoming Fist', keywords: ['fistbump', 'punch'] },
      { emoji: '🤛', name: 'Left-Facing Fist', keywords: ['fistbump'] },
      { emoji: '🤜', name: 'Right-Facing Fist', keywords: ['fistbump'] },
      { emoji: '👏', name: 'Clapping Hands', keywords: ['clap', 'applause', 'bravo'] },
      { emoji: '🙌', name: 'Raising Hands', keywords: ['hooray', 'celebrate'] },
      { emoji: '👐', name: 'Open Hands', keywords: ['open', 'hug'] },
      { emoji: '🤲', name: 'Palms Up Together', keywords: ['prayer', 'dua'] },
      { emoji: '🤝', name: 'Handshake', keywords: ['deal', 'agree', 'shake'] },
      { emoji: '🙏', name: 'Folded Hands', keywords: ['please', 'thank you', 'pray', 'namaste'] },
      { emoji: '✍️', name: 'Writing Hand', keywords: ['write', 'pen'] },
      { emoji: '💪', name: 'Flexed Biceps', keywords: ['strong', 'muscle', 'power'] },
      { emoji: '👀', name: 'Eyes', keywords: ['look', 'see'] },
      { emoji: '🧠', name: 'Brain', keywords: ['smart', 'think'] },
      { emoji: '🗣️', name: 'Speaking Head', keywords: ['talk', 'speak'] }
    ]
  },
  {
    id: 'hearts',
    name: 'Hearts & Symbols',
    icon: Heart,
    emojis: [
      { emoji: '❤️', name: 'Red Heart', keywords: ['love', 'heart'] },
      { emoji: '🧡', name: 'Orange Heart', keywords: ['love', 'heart'] },
      { emoji: '💛', name: 'Yellow Heart', keywords: ['love', 'heart'] },
      { emoji: '💚', name: 'Green Heart', keywords: ['love', 'heart'] },
      { emoji: '💙', name: 'Blue Heart', keywords: ['love', 'heart'] },
      { emoji: '💜', name: 'Purple Heart', keywords: ['love', 'heart'] },
      { emoji: '🖤', name: 'Black Heart', keywords: ['dark', 'heart'] },
      { emoji: '🤍', name: 'White Heart', keywords: ['pure', 'heart'] },
      { emoji: '🤎', name: 'Brown Heart', keywords: ['heart'] },
      { emoji: '💔', name: 'Broken Heart', keywords: ['heartbreak', 'sad'] },
      { emoji: '❣️', name: 'Heart Exclamation', keywords: ['love', 'heart'] },
      { emoji: '💕', name: 'Two Hearts', keywords: ['love', 'sweet'] },
      { emoji: '💞', name: 'Revolving Hearts', keywords: ['love'] },
      { emoji: '💓', name: 'Beating Heart', keywords: ['pulse', 'heart'] },
      { emoji: '💗', name: 'Growing Heart', keywords: ['love', 'cute'] },
      { emoji: '💖', name: 'Sparkling Heart', keywords: ['sparkle', 'love'] },
      { emoji: '💘', name: 'Heart with Arrow', keywords: ['cupid', 'love'] },
      { emoji: '💝', name: 'Heart with Ribbon', keywords: ['gift', 'love'] },
      { emoji: '🔥', name: 'Fire', keywords: ['lit', 'hot', 'burn'] },
      { emoji: '✨', name: 'Sparkles', keywords: ['shine', 'magic', 'clean'] },
      { emoji: '🌟', name: 'Glowing Star', keywords: ['star', 'shine'] },
      { emoji: '⭐', name: 'Star', keywords: ['favorite', 'star'] },
      { emoji: '💫', name: 'Dizzy Star', keywords: ['sparkle'] },
      { emoji: '💥', name: 'Collision', keywords: ['boom', 'explode', 'bang'] },
      { emoji: '💯', name: 'Hundred Points', keywords: ['100', 'perfect', 'score'] },
      { emoji: '✅', name: 'Check Mark Button', keywords: ['check', 'done', 'yes', 'verified'] },
      { emoji: '✔️', name: 'Check Mark', keywords: ['check', 'correct'] },
      { emoji: '❌', name: 'Cross Mark', keywords: ['no', 'wrong', 'cancel'] },
      { emoji: '⚠️', name: 'Warning', keywords: ['alert', 'warn'] },
      { emoji: '❓', name: 'Question Mark', keywords: ['ask', 'what'] },
      { emoji: '❗', name: 'Exclamation Mark', keywords: ['important', 'alert'] }
    ]
  },
  {
    id: 'objects',
    name: 'Objects & Activity',
    icon: Sparkles,
    emojis: [
      { emoji: '🎉', name: 'Party Popper', keywords: ['celebrate', 'party', 'congrats'] },
      { emoji: '🎊', name: 'Confetti Ball', keywords: ['celebrate', 'party'] },
      { emoji: '🎁', name: 'Wrapped Gift', keywords: ['present', 'gift'] },
      { emoji: '🎂', name: 'Birthday Cake', keywords: ['birthday', 'cake'] },
      { emoji: '🎈', name: 'Balloon', keywords: ['party', 'balloon'] },
      { emoji: '🎓', name: 'Graduation Cap', keywords: ['education', 'college', 'degree', 'school'] },
      { emoji: '🏆', name: 'Trophy', keywords: ['winner', 'first', 'prize'] },
      { emoji: '🥇', name: '1st Place Medal', keywords: ['first', 'gold', 'winner'] },
      { emoji: '🥈', name: '2nd Place Medal', keywords: ['silver', 'second'] },
      { emoji: '🥉', name: '3rd Place Medal', keywords: ['bronze', 'third'] },
      { emoji: '📱', name: 'Mobile Phone', keywords: ['phone', 'cell', 'smartphone'] },
      { emoji: '💻', name: 'Laptop', keywords: ['computer', 'work', 'tech'] },
      { emoji: '🖥️', name: 'Desktop Computer', keywords: ['screen', 'pc'] },
      { emoji: '📞', name: 'Telephone Receiver', keywords: ['call', 'phone'] },
      { emoji: '✉️', name: 'Envelope', keywords: ['email', 'letter', 'mail'] },
      { emoji: '📧', name: 'E-Mail', keywords: ['mail', 'message'] },
      { emoji: '📝', name: 'Memo', keywords: ['note', 'document', 'paper'] },
      { emoji: '📄', name: 'Page Facing Up', keywords: ['file', 'doc'] },
      { emoji: '📊', name: 'Bar Chart', keywords: ['stats', 'growth', 'analytics'] },
      { emoji: '📈', name: 'Chart Increasing', keywords: ['growth', 'profit'] },
      { emoji: '💰', name: 'Money Bag', keywords: ['dollar', 'cash', 'money'] },
      { emoji: '💵', name: 'Dollar Banknote', keywords: ['cash', 'currency'] },
      { emoji: '💳', name: 'Credit Card', keywords: ['payment', 'bank', 'card'] },
      { emoji: '💎', name: 'Gem Stone', keywords: ['diamond', 'jewelry'] },
      { emoji: '🔒', name: 'Locked', keywords: ['secure', 'safety', 'private'] },
      { emoji: '🔓', name: 'Unlocked', keywords: ['open', 'public'] },
      { emoji: '💡', name: 'Light Bulb', keywords: ['idea', 'creative'] },
      { emoji: '⏰', name: 'Alarm Clock', keywords: ['time', 'reminder'] },
      { emoji: '⏳', name: 'Hourglass Not Done', keywords: ['time', 'wait'] }
    ]
  },
  {
    id: 'food_travel',
    name: 'Food & Travel',
    icon: Coffee,
    emojis: [
      { emoji: '☕', name: 'Hot Beverage', keywords: ['coffee', 'tea', 'cafe'] },
      { emoji: '🍵', name: 'Teacup Without Handle', keywords: ['green tea', 'matcha'] },
      { emoji: '🧃', name: 'Beverage Box', keywords: ['juice'] },
      { emoji: '🍕', name: 'Pizza', keywords: ['food', 'slice'] },
      { emoji: '🍔', name: 'Hamburger', keywords: ['burger', 'fast food'] },
      { emoji: '🍟', name: 'French Fries', keywords: ['fries', 'food'] },
      { emoji: '🥪', name: 'Sandwich', keywords: ['bread', 'food'] },
      { emoji: '🍿', name: 'Popcorn', keywords: ['movie', 'snack'] },
      { emoji: '🍩', name: 'Doughnut', keywords: ['donut', 'sweet'] },
      { emoji: '🍫', name: 'Chocolate Bar', keywords: ['chocolate', 'candy'] },
      { emoji: '🚗', name: 'Automobile', keywords: ['car', 'vehicle'] },
      { emoji: '🚕', name: 'Taxi', keywords: ['cab', 'uber'] },
      { emoji: '🚙', name: 'Sport Utility Vehicle', keywords: ['car'] },
      { emoji: '🚌', name: 'Bus', keywords: ['transit'] },
      { emoji: '🛵', name: 'Motor Scooter', keywords: ['bike', 'vespa'] },
      { emoji: '✈️', name: 'Airplane', keywords: ['flight', 'travel'] },
      { emoji: '🚀', name: 'Rocket', keywords: ['launch', 'fast', 'space'] },
      { emoji: '🏠', name: 'House', keywords: ['home', 'building'] },
      { emoji: '🏢', name: 'Office Building', keywords: ['work', 'company'] },
      { emoji: '🏫', name: 'School', keywords: ['college', 'education'] }
    ]
  }
];

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelectEmoji, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState<string>('smileys');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Filter emojis based on search query
  const filteredEmojis = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase().trim();
    const results: EmojiItem[] = [];
    const seen = new Set<string>();

    for (const cat of EMOJI_CATEGORIES) {
      for (const item of cat.emojis) {
        if (seen.has(item.emoji)) continue;
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesKeyword = item.keywords.some((k) => k.toLowerCase().includes(query));
        if (matchesName || matchesKeyword) {
          seen.add(item.emoji);
          results.push(item);
        }
      }
    }
    return results;
  }, [searchQuery]);

  const currentCategoryEmojis = useMemo(() => {
    const cat = EMOJI_CATEGORIES.find((c) => c.id === activeCategory);
    return cat ? cat.emojis : EMOJI_CATEGORIES[0].emojis;
  }, [activeCategory]);

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full left-0 mb-2 w-[calc(100vw-32px)] max-w-[340px] sm:w-80 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl z-50 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
      style={{ maxHeight: '360px' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search Bar Header */}
      <div className="p-2.5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/70">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search emoji..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 rounded-xl pl-8 pr-7 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Emoji Grid Container */}
      <div className="flex-1 overflow-y-auto p-2.5 min-h-[180px] max-h-[220px] scrollbar-thin">
        {filteredEmojis !== null ? (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5 px-1">
              Search Results ({filteredEmojis.length})
            </p>
            {filteredEmojis.length > 0 ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(36px,1fr))] gap-1 justify-items-center">
                {filteredEmojis.map((item, idx) => (
                  <button
                    key={`search-${idx}-${item.emoji}`}
                    type="button"
                    title={item.name}
                    onClick={() => onSelectEmoji(item.emoji)}
                    className="w-9 h-9 flex items-center justify-center text-xl rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer select-none"
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
                No emojis matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5 px-1">
              {EMOJI_CATEGORIES.find((c) => c.id === activeCategory)?.name || 'Smileys'}
            </p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(36px,1fr))] gap-1 justify-items-center">
              {currentCategoryEmojis.map((item, idx) => (
                <button
                  key={`${activeCategory}-${idx}-${item.emoji}`}
                  type="button"
                  title={item.name}
                  onClick={() => onSelectEmoji(item.emoji)}
                  className="w-9 h-9 flex items-center justify-center text-xl rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer select-none"
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Category Tabs Footer */}
      {!searchQuery && (
        <div className="p-1.5 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/70 flex items-center justify-around">
          {EMOJI_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                title={cat.name}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs'
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
