
import React, { useState } from 'react';
import { CreditCard, ChevronRight, Zap, Award, Gift, Check, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from "@/components/ui/progress";

const BillingSettings = () => {
  const [currentPlan, setCurrentPlan] = useState('free');
  
  const plans = [
    {
      id: 'free',
      name: 'Free',
      description: 'Basic features for personal use',
      price: '$0',
      period: 'forever',
      features: ['3 active missions', 'Basic agent roster', 'Standard API rate limits'],
      cta: 'Current Plan',
      popular: false,
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'Advanced features for power users',
      price: '$12',
      period: 'per month',
      features: ['Unlimited missions', 'All agents unlocked', 'Priority support', 'Advanced analytics'],
      cta: 'Upgrade',
      popular: true,
    },
    {
      id: 'team',
      name: 'Team',
      description: 'Collaboration features for teams',
      price: '$49',
      period: 'per month',
      features: ['Everything in Pro', '5 team members', 'Team workspace', 'Shared knowledge base', 'Admin controls'],
      cta: 'Contact Sales',
      popular: false,
    }
  ];

  const usageMetrics = [
    { name: 'Missions', used: 15, limit: 25, percent: 60 },
    { name: 'API Calls', used: 1250, limit: 2000, percent: 62.5 },
    { name: 'Storage', used: 0.75, limit: 2, unit: 'GB', percent: 37.5 }
  ];

  const billingHistory = [
    { date: 'Apr 15, 2025', amount: '$0.00', status: 'Free Plan', invoice: null },
    { date: 'Mar 15, 2025', amount: '$0.00', status: 'Free Plan', invoice: null },
    { date: 'Feb 15, 2025', amount: '$0.00', status: 'Free Plan', invoice: null },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">Billing & Usage</h2>
        <p className="text-muted-foreground">Manage your subscription and monitor resource usage.</p>
      </div>

      <Card className="border border-white/10 bg-surface-alt">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-foreground">Current Plan</h3>
              <p className="text-sm text-muted-foreground">You're currently on the Free plan</p>
            </div>
            <div className="px-3 py-1 text-xs font-medium rounded-full bg-primary/20 text-primary">
              Free
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={`relative rounded-lg border ${
                  plan.id === currentPlan 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:bg-surface-2'
                } p-5 transition-all`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 -mt-3 -mr-3 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                    Popular
                  </div>
                )}
                
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-foreground">{plan.name}</h4>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>
                
                <div className="mb-4">
                  <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground"> {plan.period}</span>
                </div>
                
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm">
                      <Check className="h-4 w-4 text-primary mr-2 mt-0.5" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  variant={plan.id === currentPlan ? "outline" : "default"}
                  className={
                    plan.id === currentPlan 
                      ? "w-full border-primary/50 text-primary hover:bg-primary/10" 
                      : "w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  }
                  disabled={plan.id === currentPlan}
                >
                  {plan.id === currentPlan ? "Current Plan" : plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border bg-surface-1">
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium text-foreground mb-4">Usage</h3>
          
          <div className="space-y-6">
            {usageMetrics.map((metric) => (
              <div key={metric.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-foreground">{metric.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {metric.used} / {metric.limit} {metric.unit || ''}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {metric.percent}%
                  </span>
                </div>
                <Progress value={metric.percent} className="h-2" />
                {metric.percent > 80 && (
                  <div className="flex items-center text-amber-400 text-xs gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Approaching limit</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 rounded-md border border-border bg-surface-0 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Gift className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-foreground">Referral Program</h4>
                <p className="text-xs text-muted-foreground">Invite friends and get 10% off</p>
              </div>
            </div>
            <Button variant="outline" className="sm:w-auto w-full border-border hover:bg-surface-2">
              Copy Link
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border bg-surface-1">
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium text-foreground mb-4">Payment Method</h3>
          
          <div className="p-4 rounded-md border border-dashed border-border/50 bg-surface-0 flex items-center justify-center">
            <div className="text-center py-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mb-3">
                <CreditCard className="w-6 h-6 text-muted-foreground" />
              </div>
              <h4 className="text-sm font-medium text-foreground mb-1">No payment method added</h4>
              <p className="text-xs text-muted-foreground mb-4">Add a payment method to upgrade to a paid plan</p>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Add Payment Method
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border bg-surface-1">
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium text-foreground mb-4">Billing History</h3>
          
          <div className="divide-y divide-border">
            {billingHistory.map((item, idx) => (
              <div key={idx} className="py-4 flex items-center justify-between">
                <div>
                  <span className="text-sm text-foreground block">{item.date}</span>
                  <span className="text-xs text-muted-foreground">{item.status}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-foreground mr-4">{item.amount}</span>
                  {item.invoice ? (
                    <Button variant="ghost" size="sm" className="h-8 text-xs">
                      View
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">No invoice</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingSettings;
