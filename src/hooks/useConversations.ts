import { useState } from 'react';
import { Conversation, Message } from '../types';
import { sampleConversations } from '../data/sampleConversations';

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>(sampleConversations);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>('1');

  const currentConversation = conversations.find(c => c.id === currentConversationId);

  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'New conversation',
      messages: [],
      lastUpdated: new Date()
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
  };

  const addMessage = (content: string, isUser: boolean) => {
    if (!currentConversationId) return;

    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      content,
      isUser,
      timestamp: new Date()
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === currentConversationId) {
        const updatedMessages = [...conv.messages, newMessage];
        return {
          ...conv,
          messages: updatedMessages,
          title: conv.title === 'New conversation' && isUser ? 
            content.slice(0, 50) + (content.length > 50 ? '...' : '') : 
            conv.title,
          lastUpdated: new Date()
        };
      }
      return conv;
    }));

    // Simulate AI response for demo
    if (isUser) {
      setTimeout(() => {
        const aiResponse = generateAIResponse(content);
        addMessage(aiResponse, false);
      }, 1000);
    }
  };

  const generateAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('resume')) {
      return `I'd be happy to help improve your resume! To provide the best suggestions, I need to understand your specific situation better:

1. **What role/industry are you targeting?**
2. **What's your current experience level?**
3. **What specific part of your resume feels weak or generic?**

In the meantime, here are some universal principles to make any resume stand out:

**Quantify Everything:** Replace vague statements with specific metrics
- "Managed projects" → "Led 5 cross-functional projects, delivering 100% on-time with average 15% budget savings"

**Show Progression:** Demonstrate growth in responsibility and impact
**Use Power Verbs:** Architected, optimized, transformed, spearheaded, pioneered

**Results-First Format:** Lead each bullet with the outcome, then explain how you achieved it

Would you like to share a specific section of your resume for detailed feedback?`;
    }
    
    if (lowerMessage.includes('introduction') || lowerMessage.includes('elevator')) {
      return `Excellent! A compelling self-introduction is your secret weapon for standing out. Let's create something memorable:

**The "Standout" Formula:**
1. **Unique Hook** (What makes you different?)
2. **Credible Proof** (Specific achievement)
3. **Forward Value** (What you bring to others)

**Avoid These Common Mistakes:**
- Generic titles ("I'm a marketing professional...")
- Laundry list of skills
- No personality or memorable details
- Missing the "so what?" factor

**Better Approach:**
"I help companies turn confused customers into raving fans. When I joined [Company], their customer satisfaction was 3.2/5. I redesigned their entire onboarding experience and it jumped to 4.7/5 in just 6 months. I love finding those small friction points that make huge differences."

**What makes this work:**
✅ Clear value proposition
✅ Specific, impressive metric
✅ Shows methodology (finding friction points)
✅ Memorable and conversational

Tell me about your background and the context where you'll use this introduction, and I'll help craft something uniquely powerful for you!`;
    }
    
    if (lowerMessage.includes('linkedin')) {
      return `LinkedIn optimization is crucial for standing out to recruiters! Let's transform your profile into a magnet:

**The Problem:** Most LinkedIn profiles are boring job descriptions that recruiters skim over in 3 seconds.

**The Solution:** Turn your profile into a compelling story that makes recruiters think "I need to talk to this person."

**Profile Audit Checklist:**

**Headline (Most Important!):**
❌ "Software Engineer at ABC Company"  
✅ "Full-Stack Engineer | React & Python Expert | Built platforms for 2M+ users | Passionate about clean code & user experience"

**Summary Section Structure:**
1. **Problem/Opportunity Hook** (Why your work matters)
2. **Your Unique Approach** (How you're different)
3. **Proof Points** (Specific achievements with numbers)
4. **Current Focus** (What you're working on/interested in)
5. **Call-to-Action** (What you want)

**Experience Optimization:**
- Each role should tell a mini-story of challenges → actions → results
- Include keywords from your target job descriptions
- Use bullet points with strong action verbs
- Add media/links to showcase your work

**Activity Strategy:**
- Share insights about your projects (builds credibility)
- Comment meaningfully on industry posts
- Post about professional wins and learnings

Would you like me to help rewrite a specific section of your LinkedIn profile?`;
    }

    return `Thanks for sharing! I'm here to help you elevate your content above the average. Whether it's your resume, self-introduction, cover letter, or LinkedIn profile, my goal is to help you stand out authentically.

To give you the most impactful suggestions, could you:

1. **Share the specific content** you'd like to improve
2. **Tell me your target audience** (hiring managers, networking contacts, etc.)
3. **Describe your goal** (job interviews, career change, promotions, etc.)

I'll then provide specific, actionable recommendations that showcase your unique value and help you avoid generic, forgettable content.

What would you like to work on first?`;
  };

  return {
    conversations,
    currentConversation,
    currentConversationId,
    createNewConversation,
    setCurrentConversationId,
    addMessage
  };
};