import React from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";

const ShadcnTest: React.FC = () => {
  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="flex justify-end mb-4">
        <ThemeToggle />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>shadcn/ui Test</CardTitle>
          <CardDescription>Testing shadcn/ui components</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tab1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tab1">Tab 1</TabsTrigger>
              <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1">
              <p className="py-4">This is the content for Tab 1</p>
              <Button>Button in Tab 1</Button>
            </TabsContent>
            <TabsContent value="tab2">
              <p className="py-4">This is the content for Tab 2</p>
              <Button variant="outline">Button in Tab 2</Button>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost">Cancel</Button>
          <Button>Save</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ShadcnTest;