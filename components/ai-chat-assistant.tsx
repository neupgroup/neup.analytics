'use client';

import { useState } from 'react';
import { Bot, Send } from 'lucide-react';
import { Button } from '@/component/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/component/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/component/ui/avatar';
import { cn } from '@/core/utils';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from './ui/form';

// Mock AI function
async function getAIResponse(message: string) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  if (message.toLowerCase().includes('conversions drop')) {
    return "Conversions dropped by 15% last week, primarily due to a bug in the checkout flow on mobile devices. I recommend investigating user sessions from last Tuesday.";
  }
  if (message.toLowerCase().includes('bounce rate')) {
    return "The bounce rate for the new landing page is high at 75%. The heatmap suggests users are not scrolling far enough to see the main call-to-action.";
  }
  return "I'm sorry, I can only provide insights on conversion drops and bounce rates at the moment. How can I help with those?";
}

const formSchema = z.object({
  prompt: z.string().min(1, { message: 'Please enter a question.' }),
});

type Message = {
  text: string;
  sender: 'user' | 'ai';
};

export function AIChatAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { prompt: '' },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const userMessage: Message = { text: values.prompt, sender: 'user' };
    setMessages((prev) => [...prev, userMessage]);
    form.reset();
    setIsThinking(true);

    const aiResponse = await getAIResponse(values.prompt);
    const aiMessage: Message = { text: aiResponse, sender: 'ai' };
    
    setMessages((prev) => [...prev, aiMessage]);
    setIsThinking(false);
  };
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="tertiary" size="icon" className="rounded-full">
          <Bot className="h-5 w-5" />
          <span className="sr-only">AI Assistant</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] md:max-w-lg lg:max-w-2xl grid-rows-[auto,1fr,auto]">
        <DialogHeader>
          <DialogTitle>Analytics Assistant</DialogTitle>
          <DialogDescription>
            Ask a question about your data in natural language.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96 w-full pr-4">
          <div className="flex flex-col gap-4 p-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-start gap-3',
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.sender === 'ai' && (
                  <Avatar className="h-8 w-8">
                     <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    'max-w-xs rounded-lg p-3 text-sm md:max-w-md',
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {message.text}
                </div>
                 {message.sender === 'user' && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="https://picsum.photos/seed/user-avatar/32/32" />
                    <AvatarFallback>ME</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
             {isThinking && (
              <div className="flex items-start gap-3 justify-start">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <div className="max-w-xs rounded-lg p-3 text-sm md:max-w-md bg-muted">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-foreground/50 [animation-delay:-0.3s]"></span>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-foreground/50 [animation-delay:-0.15s]"></span>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-foreground/50"></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex w-full items-start gap-2">
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="Why did conversions drop last week?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" variant="primary" size="icon" disabled={isThinking}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </Form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
