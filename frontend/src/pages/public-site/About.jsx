import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Database,
  Eye,
  FileText,
  Heart,
  Layers3,
  LineChart,
  Mic,
  Network,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Users2,
  Workflow,
  Zap,
} from 'lucide-react';

import PublicLayout from '../../layouts/PublicLayout';
import Button from '../../shared/Button/Button';
import Card from '../../shared/Card/Card';
import Team from './Team';

const About = () => {
  const workflowSteps = [
    {
      number: '01',
      title: 'PLAN',
      description: 'Define what needs to happen.',
      icon: Target,
    },
    {
      number: '02',
      title: 'CONNECT',
      description: 'Bring the right people together.',
      icon: Users2,
    },
    {
      number: '03',
      title: 'EXECUTE',
      description: 'Turn responsibilities into action.',
      icon: Zap,
    },
    {
      number: '04',
      title: 'CAPTURE',
      description: 'Create a structured record of the work.',
      icon: Database,
    },
    {
      number: '05',
      title: 'UNDERSTAND',
      description: 'Use data, analytics, and visualization.',
      icon: BarChart3,
    },
    {
      number: '06',
      title: 'IMPROVE',
      description: 'Make better decisions.',
      icon: LineChart,
    },
    {
      number: '07',
      title: 'REPEAT',
      description: 'Every cycle makes the organization more informed.',
      icon: RefreshCw,
    },
  ];

  const operationalLayers = [
    {
      icon: Users2,
      title: 'People',
      description: 'Who is involved?',
    },
    {
      icon: ShieldCheck,
      title: 'Responsibilities',
      description: 'Who is responsible for what?',
    },
    {
      icon: Workflow,
      title: 'Activities',
      description: 'What needs to happen?',
    },
    {
      icon: FileText,
      title: 'Information',
      description: 'What is happening?',
    },
    {
      icon: BrainCircuit,
      title: 'Decisions',
      description: 'What should happen next?',
    },
    {
      icon: CheckCircle2,
      title: 'Outcomes',
      description: 'What changed because the work happened?',
    },
  ];

  const perspectives = [
    {
      icon: UserRound,
      label: 'Team Member',
      title: 'My Responsibilities',
      description:
        'A focused view of assigned activities, priorities, updates, and work that needs attention.',
    },
    {
      icon: Users2,
      label: 'Manager',
      title: 'My Team',
      description:
        'A team-level view of responsibilities, progress, bottlenecks, and operational activity.',
    },
    {
      icon: Layers3,
      label: 'Administrator',
      title: 'My Organization',
      description:
        'A broader operational picture across departments, people, activities, and organizational data.',
    },
    {
      icon: Eye,
      label: 'Leadership',
      title: 'The Bigger Picture',
      description:
        'A strategic view of organizational performance, patterns, trends, and areas requiring attention.',
    },
  ];

  const environments = [
    {
      title: 'Healthcare',
      description:
        'Coordinate teams, operational activities, structured workflows, and prescription-related processes.',
    },
    {
      title: 'Education',
      description:
        'Connect departments, projects, activities, teams, and institutional operations.',
    },
    {
      title: 'Business',
      description:
        'Manage people, projects, workflows, responsibilities, and performance through one environment.',
    },
    {
      title: 'Nonprofit',
      description:
        'Coordinate people, programs, activities, documentation, and organizational reporting.',
    },
  ];

  return (
    <PublicLayout>
      {/* =========================================================
          HERO
      ========================================================= */}
      <section className="relative overflow-hidden bg-white px-[5%] pt-16 pb-20 sm:pt-20 md:pt-28 lg:pt-32 lg:pb-28">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-indigo-100/50 blur-3xl" />

        <div className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-blue-100/40 blur-3xl" />

        <div className="relative mx-auto max-w-6xl">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
                <Heart size={16} />
                About WorkSphere
              </div>

              <h1 className="max-w-3xl font-[var(--font-title)] text-[2.6rem] font-extrabold leading-[1.08] tracking-tight text-gray-950 sm:text-[3.5rem] lg:text-[4.25rem]">
                What Happens When an Organization Finally{' '}
                <span className="text-indigo-600">Works as One?</span>
              </h1>

              <p className="mt-7 max-w-2xl text-[1.05rem] leading-8 text-gray-600 sm:text-[1.15rem]">
                Organizations rarely struggle because they lack people.
                They struggle because their people, information,
                responsibilities, and processes are scattered.
              </p>

              <p className="mt-4 max-w-2xl text-base leading-7 text-gray-500">
                WorkSphere creates a connected environment where the work
                itself becomes organized, visible, measurable, and actionable.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/register-org">
                  <Button
                    size="large"
                    variant="secondary"
                    className="group flex w-full items-center justify-center gap-2 rounded-xl px-7 py-4 font-bold shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:w-auto"
                  >
                    Register Your Organization
                    <ArrowRight
                      size={19}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </Button>
                </Link>

                <Link to="/login-choice">
                  <Button
                    size="large"
                    variant="secondary"
                    className="flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-7 py-4 font-bold text-gray-800 shadow-sm transition-all duration-300 hover:border-indigo-300 hover:bg-indigo-50 sm:w-auto"
                  >
                    Enter Workspace
                  </Button>
                </Link>
              </div>
            </div>

            {/* HERO VISUAL */}
            <div className="relative">
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-indigo-100/70 via-white to-blue-100/60 blur-2xl" />

              <div className="relative overflow-hidden rounded-[2rem] border border-gray-200 bg-white p-5 shadow-[0_30px_80px_rgba(15,23,42,0.10)] sm:p-7">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Operational Picture
                    </p>

                    <h3 className="mt-1 text-xl font-bold text-gray-900">
                      One Organization
                    </h3>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                    <Network className="text-indigo-600" size={20} />
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      icon: Users2,
                      title: 'People',
                      text: 'Right people identified',
                    },
                    {
                      icon: Workflow,
                      title: 'Responsibilities',
                      text: 'Ownership becomes clear',
                    },
                    {
                      icon: ActivityIcon,
                      title: 'Work',
                      text: 'Progress becomes visible',
                    },
                    {
                      icon: BarChart3,
                      title: 'Insights',
                      text: 'Patterns become measurable',
                    },
                  ].map((item, index) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={index}
                        className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                          <Icon className="text-indigo-600" size={20} />
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900">
                            {item.title}
                          </p>

                          <p className="text-sm text-gray-500">
                            {item.text}
                          </p>
                        </div>

                        <ChevronRight
                          size={17}
                          className="ml-auto shrink-0 text-gray-300"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 rounded-2xl bg-indigo-50 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm">
                      <CircleDot size={17} className="text-indigo-600" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Connected Operational System
                      </p>

                      <p className="text-xs text-gray-500">
                        Activity → Information → Insight → Decision
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          THE PROBLEM
      ========================================================= */}
      <section className="border-t border-gray-200 bg-gray-50 px-[5%] py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">
                The Problem
              </p>

              <h2 className="max-w-lg text-[2rem] font-extrabold leading-tight tracking-tight text-gray-950 sm:text-[2.6rem]">
                The Problem Isn't the Work. It's the Disconnect.
              </h2>
            </div>

            <div>
              <p className="text-lg leading-8 text-gray-600">
                A task lives in one place. A document lives somewhere else.
                An update gets lost in a message. A report takes hours to
                prepare. A manager has to ask three people just to understand
                what is happening.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  'Scattered responsibilities',
                  'Information trapped in conversations',
                  'Manual reporting',
                  'Limited operational visibility',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="h-2 w-2 rounded-full bg-indigo-500" />

                    <span className="text-sm font-medium text-gray-700">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          CONNECTED WORKFLOW
      ========================================================= */}
      <section className="bg-white px-[5%] py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">
              Connected Work
            </p>

            <h2 className="text-[2rem] font-extrabold leading-tight tracking-tight text-gray-950 sm:text-[2.6rem]">
              When Everything Is Connected, Work Moves Differently.
            </h2>

            <p className="mt-5 text-base leading-7 text-gray-500 sm:text-lg">
              WorkSphere connects the everyday actions of an organization into
              one continuous operational flow.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                number: '01',
                title: 'Activity Begins',
                text: 'A new activity or piece of work begins.',
              },
              {
                number: '02',
                title: 'People Connect',
                text: 'The right people and responsibilities are identified.',
              },
              {
                number: '03',
                title: 'Work Starts',
                text: 'Everyone knows what they own and progress becomes visible.',
              },
              {
                number: '04',
                title: 'Information Is Captured',
                text: 'Important updates become part of the operational record.',
              },
              {
                number: '05',
                title: 'Patterns Emerge',
                text: 'Structured data begins revealing what is working.',
              },
              {
                number: '06',
                title: 'Decisions Improve',
                text: 'Leaders can act using a clearer picture of the organization.',
              },
            ].map((item) => (
              <Card
                key={item.number}
                className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl"
              >
                <div className="flex items-start gap-5">
                  <span className="text-sm font-bold text-indigo-500">
                    {item.number}
                  </span>

                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      {item.text}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          OPERATIONAL LAYERS - LIGHT BLUE
      ========================================================= */}
      <section className="border-y border-blue-100 bg-[#eef6ff] px-[5%] py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">
                The Work Behind Every Organization
              </p>

              <h2 className="text-[2rem] font-extrabold leading-tight tracking-tight text-gray-950 sm:text-[2.6rem]">
                Behind Every Organization Is a Workflow.
              </h2>

              <p className="mt-5 max-w-lg leading-7 text-gray-600">
                Every organization has an underlying cycle. WorkSphere connects
                these layers so information doesn't disappear between people,
                processes, and decisions.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {operationalLayers.map((item, index) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-md"
                  >
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                      <Icon size={19} className="text-indigo-600" />
                    </div>

                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      0{index + 1}
                    </p>

                    <h3 className="mt-1 font-bold text-gray-900">
                      {item.title}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          MORE THAN TASK MANAGEMENT
      ========================================================= */}
      <section className="bg-white px-[5%] py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">
                More Than Task Management
              </p>

              <h2 className="text-[2rem] font-extrabold leading-tight tracking-tight text-gray-950 sm:text-[2.6rem]">
                The Work Doesn't Disappear Into the System.
                <span className="text-indigo-600"> It Moves Through It.</span>
              </h2>

              <p className="mt-6 leading-8 text-gray-600">
                A manager creates an activity. WorkSphere identifies the
                responsibility. A team member begins the task. Progress is
                recorded. An update is required. The relevant people are
                notified. The activity is completed.
              </p>

              <p className="mt-4 leading-8 text-gray-600">
                The result becomes part of the organization's operational
                record — allowing daily work to continuously build useful
                organizational knowledge.
              </p>
            </div>

            <div className="relative">
              <div className="rounded-[2rem] border border-gray-200 bg-gray-50 p-6 sm:p-8">
                <div className="space-y-4">
                  {[
                    ['Activity', 'Work begins'],
                    ['Information', 'Work gets recorded'],
                    ['Insight', 'Patterns become visible'],
                    ['Decision', 'Leadership understands what to do'],
                    ['Improvement', 'The next cycle becomes better'],
                  ].map(([title, text], index) => (
                    <div key={title} className="relative">
                      <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-600">
                          {index + 1}
                        </div>

                        <div>
                          <p className="font-bold text-gray-900">{title}</p>

                          <p className="text-sm text-gray-500">{text}</p>
                        </div>
                      </div>

                      {index < 4 && (
                        <div className="ml-[30px] h-4 border-l border-dashed border-indigo-200" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          WORKSPHERE LOOP
      ========================================================= */}
      <section className="bg-[#eaf4ff] px-[5%] py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg">
              <RefreshCw size={22} />
            </div>

            <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">
              The WorkSphere Loop
            </p>

            <h2 className="mt-3 text-[2rem] font-extrabold tracking-tight text-gray-950 sm:text-[2.6rem]">
              Every Cycle Makes the Organization More Informed.
            </h2>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.title}
                  className={`relative rounded-2xl border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                    index === workflowSteps.length - 1
                      ? 'border-indigo-300'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-widest text-indigo-500">
                      {step.number}
                    </span>

                    <Icon size={19} className="text-indigo-600" />
                  </div>

                  <h3 className="mt-6 text-lg font-extrabold tracking-wide text-gray-900">
                    {step.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    {step.description}
                  </p>

                  {index < workflowSteps.length - 1 && (
                    <div className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-indigo-100 bg-white text-indigo-400 shadow-sm lg:flex">
                      <ChevronRight size={14} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          AI - LIGHT BLUE
      ========================================================= */}
      <section className="bg-[#eef6ff] px-[5%] py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="overflow-hidden rounded-[2rem] border border-blue-100 bg-white p-7 shadow-[0_20px_60px_rgba(37,99,235,0.08)] sm:p-10 lg:p-14">
            <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50">
                  <Mic className="text-indigo-600" size={23} />
                </div>

                <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">
                  Intelligence in the Workflow
                </p>

                <h2 className="mt-3 text-[2rem] font-extrabold leading-tight text-gray-950 sm:text-[2.5rem]">
                  AI Should Work in the Background.
                </h2>

                <p className="mt-5 leading-7 text-gray-600">
                  WorkSphere doesn't need AI everywhere. It needs AI where it
                  removes friction and allows professionals to stay focused on
                  their actual work.
                </p>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-6 sm:p-8">
                <p className="mb-6 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                  Example: Structured Prescription Workflow
                </p>

                <div className="space-y-3">
                  {[
                    ['Voice', 'Doctor dictates the prescription'],
                    ['AI Processing', 'Speech is interpreted and structured'],
                    ['Structured Prescription', 'Relevant information is organized'],
                    ['Record', 'The result becomes part of the operational record'],
                  ].map(([title, text], index) => (
                    <div key={title}>
                      <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-600">
                          {index + 1}
                        </div>

                        <div>
                          <p className="font-semibold text-gray-900">
                            {title}
                          </p>

                          <p className="text-sm text-gray-500">{text}</p>
                        </div>
                      </div>

                      {index < 3 && (
                        <div className="ml-8 h-3 border-l border-dashed border-indigo-200" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          DIFFERENT PERSPECTIVES
      ========================================================= */}
      <section className="border-t border-gray-200 bg-gray-50 px-[5%] py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">
              One System. Different Perspectives.
            </p>

            <h2 className="mt-3 text-[2rem] font-extrabold tracking-tight text-gray-950 sm:text-[2.6rem]">
              From Daily Work to Leadership View.
            </h2>

            <p className="mt-5 leading-7 text-gray-500">
              The same operational system can present the right information to
              the right person without losing the bigger picture.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {perspectives.map((item) => {
              const Icon = item.icon;

              return (
                <Card
                  key={item.label}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50">
                    <Icon size={20} className="text-indigo-600" />
                  </div>

                  <p className="mt-6 text-xs font-bold uppercase tracking-wider text-gray-400">
                    {item.label}
                  </p>

                  <h3 className="mt-1 text-xl font-bold text-gray-900">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-gray-500">
                    {item.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          FLEXIBLE ORGANIZATIONS
      ========================================================= */}
      <section className="bg-white px-[5%] py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">
                Built to Adapt
              </p>

              <h2 className="mt-3 text-[2rem] font-extrabold leading-tight tracking-tight text-gray-950 sm:text-[2.6rem]">
                The Same Platform. Different Ways of Working.
              </h2>

              <p className="mt-5 leading-8 text-gray-600">
                WorkSphere is designed as a flexible operational foundation.
                The platform remains consistent while each organization can
                shape it around the way its teams actually work.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {environments.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-6 transition-all duration-300 hover:border-indigo-200 hover:bg-indigo-50/40"
                >
                  <h3 className="text-lg font-bold text-gray-900">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SCALE
      ========================================================= */}
      <section className="bg-gray-50 px-[5%] py-20 md:py-24">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
            <Layers3 className="text-indigo-600" size={25} />
          </div>

          <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">
            Designed to Grow
          </p>

          <h2 className="mt-3 text-[2rem] font-extrabold tracking-tight text-gray-950 sm:text-[2.6rem]">
            Start Where You Are. Scale Where You Need to Go.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl leading-8 text-gray-600">
            An organization may begin with a small team and grow into
            multiple departments, more users, more projects, and greater
            reporting needs. WorkSphere is designed to evolve alongside that
            growth.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {[
              'More people',
              'More departments',
              'More projects',
              'More information',
              'More reporting',
              'More intelligence',
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          HOPEFELT FOUNDATION
      ========================================================= */}
      <section className="bg-white px-[5%] py-20 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[2rem] border border-gray-200 bg-white p-7 shadow-[0_20px_70px_rgba(15,23,42,0.07)] sm:p-10 md:p-14">
            <div className="grid gap-10 md:grid-cols-[auto_1fr]">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50">
                <Heart className="text-indigo-600" size={25} />
              </div>

              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">
                  Why Hopefelt Foundation Built It
                </p>

                <h2 className="mt-3 text-[2rem] font-extrabold tracking-tight text-gray-950 sm:text-[2.5rem]">
                  Meaningful Work Deserves Better Systems.
                </h2>

                <p className="mt-6 leading-8 text-gray-600">
                  WorkSphere comes from a simple observation: organizations
                  doing meaningful work deserve better systems to support that
                  work.
                </p>

                <p className="mt-4 leading-8 text-gray-600">
                  Hopefelt Foundation's experience in organizational and
                  community initiatives provided the foundation for
                  understanding how much coordination, communication,
                  documentation, and administration sits behind meaningful
                  outcomes.
                </p>

                <p className="mt-4 leading-8 text-gray-600">
                  WorkSphere takes that understanding and translates it into
                  digital infrastructure — not to replace people, but to give
                  people a better system to work through.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          WHAT WORKSPHERE IS REALLY ABOUT - LIGHT BLUE
      ========================================================= */}
      <section className="border-y border-blue-100 bg-[#eaf4ff] px-[5%] py-20 md:py-24">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">
            What WorkSphere Is Really About
          </p>

          <h2 className="mt-3 text-[2rem] font-extrabold leading-tight text-gray-950 sm:text-[2.7rem]">
            It Isn't About Another Dashboard.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl leading-8 text-gray-600">
            It is about creating clarity across the organization — clarity
            about what is happening, who owns it, what needs attention, what
            the organization has accomplished, and what should happen next.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              'Who is doing what.',
              'What is happening.',
              'What needs attention.',
              'What the organization has accomplished.',
              'What the data is telling you.',
              'What should happen next.',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-xl border border-blue-100 bg-white p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <CheckCircle2
                  size={18}
                  className="shrink-0 text-indigo-600"
                />

                <span className="text-sm font-medium text-gray-700">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          TEAM
      ========================================================= */}
      <Team />

      {/* =========================================================
          FINAL CTA
      ========================================================= */}
      <section className="relative overflow-hidden bg-white px-[5%] py-24 md:py-28">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-100/60 blur-3xl" />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg">
            <Sparkles size={24} />
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">
            Ready to See Your Organization Differently?
          </p>

          <h2 className="mt-3 text-[2.2rem] font-extrabold leading-tight tracking-tight text-gray-950 sm:text-[3.1rem]">
            Move from scattered operations to one connected way of working.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-gray-500 sm:text-lg">
            Give your teams the structure they need while keeping their
            attention on the work that actually matters.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/register-org">
              <Button
                size="large"
                variant="secondary"
                className="group flex w-full items-center justify-center gap-2 rounded-xl px-8 py-4 font-bold shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:w-auto"
              >
                Register Your Organization
                <ArrowRight
                  size={19}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Button>
            </Link>

            <Link to="/login-choice">
              <Button
                size="large"
                variant="secondary"
                className="w-full rounded-xl border border-gray-300 bg-white px-8 py-4 font-bold text-gray-800 transition-all duration-300 hover:border-indigo-300 hover:bg-indigo-50 sm:w-auto"
              >
                Enter Workspace
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

/* =========================================================
   CUSTOM ACTIVITY ICON
========================================================= */

const ActivityIcon = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M4 19V5M4 19H20M8 16V12M12 16V8M16 16V5M20 16V10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default About;
