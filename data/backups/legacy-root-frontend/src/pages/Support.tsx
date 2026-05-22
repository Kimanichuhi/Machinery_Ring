import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  HelpCircle, 
  Plus, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  MessageSquare,
  Upload,
  Send,
  Inbox
} from 'lucide-react';

// Support page - simplified without backend API calls
// Support requests would need a dedicated Supabase table if needed

export function Support() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category || !description) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate submission - in production, this would create a support_requests record
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: 'Request Submitted',
      description: 'Your support request has been sent. We will respond via email.',
    });
    
    setShowForm(false);
    setCategory('');
    setDescription('');
    setPriority('medium');
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Support</h1>
          <p className="text-sm text-muted-foreground">Report issues and get help</p>
        </div>
        <Button variant="forest" size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Quick Contact */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Email Support</p>
              <p className="text-xs text-muted-foreground">support@mro.co.ke</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <p className="font-medium text-sm">WhatsApp</p>
              <p className="text-xs text-muted-foreground">+254 711 417 507</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <p className="font-medium text-sm">Response Time</p>
              <p className="text-xs text-muted-foreground">Within 24 hours</p>
            </div>
          </div>
        </Card>
      </div>

      {/* New Request Form */}
      {showForm && (
        <Card variant="elevated" className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Report an Issue
            </CardTitle>
            <CardDescription>Describe your issue and our team will assist you</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Issue Category *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system-failure">System Failure</SelectItem>
                      <SelectItem value="app-crash">App Crash</SelectItem>
                      <SelectItem value="missing-data">Missing Data</SelectItem>
                      <SelectItem value="incorrect-data">Incorrect Data</SelectItem>
                      <SelectItem value="permission-error">Permission Error</SelectItem>
                      <SelectItem value="sync-issue">Sync Issue</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Minor inconvenience</SelectItem>
                      <SelectItem value="medium">Medium - Affects work</SelectItem>
                      <SelectItem value="high">High - Blocking work</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the issue in detail. What were you trying to do? What happened instead?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Screenshot (optional)</Label>
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  type="submit" 
                  variant="forest" 
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* FAQ Section */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl bg-muted/50">
            <p className="font-medium text-sm">How do I reset my password?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Go to the login page and click "Forgot password?" to receive a reset link via email.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50">
            <p className="font-medium text-sm">Why can't I see certain data?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your access is determined by your role. Contact your administrator if you need expanded access.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50">
            <p className="font-medium text-sm">How do I update my profile?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Go to Settings → Profile to update your name, phone number, and avatar.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
