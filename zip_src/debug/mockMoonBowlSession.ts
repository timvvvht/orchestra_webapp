/*
   Every string below is a literal SSE payload:
     event: chunk\n
     data: {…JSON…}\n\n
*/
export const mockSSEFrames: string[] = [
  // 1) assistant "chunk"
  `event: chunk\ndata: ${JSON.stringify({
    event_type: 'chunk',
    session_id: '12fd54e9-5b07-4371-867d-6ec5aa7526ed',
    message_id:
      'acs_todo_12fd54e9-5b07-4371-867d-6ec5aa7526ed-assistant-1-1750560287733',
    data: {
      content:
        'Okay, I will search online for "moon bowls" in San Francisco …'
    }
  })}\n\n`,

  // 2) tool_call  (think)
  `event: tool_call\ndata: ${JSON.stringify({
    tool_call: {
      id: 'tool_8b4f153a',
      name: 'think',
      arguments: {
        thought:
          'Starting research phase. Will use agentic_web_search for "moon bowls in SF".'
      }
    }
  })}\n\n`,

  // 3) tool_result  (think result)
  `event: tool_result\ndata: ${JSON.stringify({
    tool_use_id: 'tool_8b4f153a',
    success: true,
    result: { message: 'Your thought has been logged.', success: true }
  })}\n\n`,

  // 4) tool_call (web search)
  `event: tool_call\ndata: ${JSON.stringify({
    tool_call: {
      id: 'tool_9c2d847b',
      name: 'agentic_web_search',
      arguments: {
        query: 'moon bowls San Francisco restaurants',
        max_results: 10
      }
    }
  })}\n\n`,

  // 5) tool_result (web search results)
  `event: tool_result\ndata: ${JSON.stringify({
    tool_use_id: 'tool_9c2d847b',
    success: true,
    result: {
      results: [
        {
          title: 'Moon Bowl - Asian Fusion Restaurant',
          url: 'https://moonbowlsf.com',
          snippet: 'Authentic Asian fusion cuisine in the heart of San Francisco...'
        },
        {
          title: 'Best Moon Bowl Restaurants in SF - Yelp',
          url: 'https://yelp.com/sf/moon-bowl',
          snippet: 'Top rated moon bowl restaurants with reviews and photos...'
        }
      ]
    }
  })}\n\n`,

  // 6) assistant response chunk
  `event: chunk\ndata: ${JSON.stringify({
    event_type: 'chunk',
    session_id: '12fd54e9-5b07-4371-867d-6ec5aa7526ed',
    message_id:
      'acs_todo_12fd54e9-5b07-4371-867d-6ec5aa7526ed-assistant-2-1750560290123',
    data: {
      content: 'I found some great moon bowl restaurants in San Francisco! Here are the top options:\n\n'
    }
  })}\n\n`,

  // 7) more assistant content
  `event: chunk\ndata: ${JSON.stringify({
    event_type: 'chunk',
    session_id: '12fd54e9-5b07-4371-867d-6ec5aa7526ed',
    message_id:
      'acs_todo_12fd54e9-5b07-4371-867d-6ec5aa7526ed-assistant-2-1750560290123',
    data: {
      content: '**Moon Bowl** - This is an authentic Asian fusion restaurant located in the heart of San Francisco. They specialize in traditional moon bowl dishes with a modern twist.\n\n'
    }
  })}\n\n`,

  // 8) final chunk
  `event: chunk\ndata: ${JSON.stringify({
    event_type: 'chunk',
    session_id: '12fd54e9-5b07-4371-867d-6ec5aa7526ed',
    message_id:
      'acs_todo_12fd54e9-5b07-4371-867d-6ec5aa7526ed-assistant-2-1750560290123',
    data: {
      content: 'You can find more highly-rated moon bowl restaurants on Yelp with detailed reviews and photos. Would you like me to get more specific information about any of these restaurants?'
    }
  })}\n\n`,

  // 9) done event
  `event: done\ndata: ${JSON.stringify({
    event_type: 'done',
    session_id: '12fd54e9-5b07-4371-867d-6ec5aa7526ed',
    message_id:
      'acs_todo_12fd54e9-5b07-4371-867d-6ec5aa7526ed-assistant-2-1750560290123'
  })}\n\n`
];

// Complete Orchestra agent events matching the real conversation
export const mockOrchestraEvents: string[] = [
  // Connected event
  JSON.stringify({
    type: 'connected',
    session_id: '12fd54e9-5b07-4371-867d-6ec5aa7526ed',
    timestamp: Date.now()
  }),

  // 1. Initial assistant response chunk
  JSON.stringify({
    type: 'agent_event',
    payload: {
      event_id: 'evt_001',
      session_id: '12fd54e9-5b07-4371-867d-6ec5aa7526ed',
      event_type: 'chunk',
      timestamp: Date.now(),
      message_id: 'acs_todo_12fd54e9-5b07-4371-867d-6ec5aa7526ed-assistant-1-1750560287733',
      data: {
        text: 'Okay, I will search online for "moon bowls" in San Francisco and then create a brief document summarizing the findings in the `/tmp` directory.\n\nFirst, I need to understand what "moon bowls" are in the context of SF. This likely refers to a food item or a type of restaurant.'
      }
    }
  }),

  // 2. First think tool call
  JSON.stringify({
    type: 'agent_event',
    payload: {
      event_id: 'evt_002',
      session_id: '12fd54e9-5b07-4371-867d-6ec5aa7526ed',
      event_type: 'tool_call',
      timestamp: Date.now(),
      message_id: 'acs_todo_12fd54e9-5b07-4371-867d-6ec5aa7526ed-assistant-1-1750560287733',
      data: {
        call_id: 'tool_8b4f153a',
        tool_name: 'think',
        tool_input: {
          thought: 'Starting research phase. I will use agentic_web_search to find information about "moon bowls in San Francisco".'
        }
      }
    }
  }),

  // 3. Think tool result
  JSON.stringify({
    type: 'agent_event',
    payload: {
      event_id: 'evt_003',
      session_id: '12fd54e9-5b07-4371-867d-6ec5aa7526ed',
      event_type: 'tool_result',
      timestamp: Date.now(),
      message_id: 'acs_todo_12fd54e9-5b07-4371-867d-6ec5aa7526ed-assistant-1-1750560287733',
      data: {
        call_id: 'tool_8b4f153a',
        tool_name: 'think',
        result: { message: 'Your thought has been logged.', success: true },
        success: true
      }
    }
  }),

  // 4. agentic_web_search tool call
  JSON.stringify({
    type: 'agent_event',
    payload: {
      event_id: 'evt_004',
      session_id: '12fd54e9-5b07-4371-867d-6ec5aa7526ed',
      event_type: 'tool_call',
      timestamp: Date.now(),
      message_id: 'acs_todo_12fd54e9-5b07-4371-867d-6ec5aa7526ed-assistant-2-1750560291049',
      data: {
        call_id: 'tool_57382318',
        tool_name: 'agentic_web_search',
        tool_input: {
          query: 'moon bowls in San Francisco',
          context: 'Researching a food item or restaurant type called "moon bowls" located in San Francisco.',
          max_results: 5,
          search_focus: 'general_info'
        }
      }
    }
  }),

  // 5. agentic_web_search tool result (error)
  JSON.stringify({
    type: 'agent_event',
    payload: {
      event_id: 'evt_005',
      session_id: '12fd54e9-5b07-4371-867d-6ec5aa7526ed',
      event_type: 'tool_result',
      timestamp: Date.now(),
      message_id: 'acs_todo_12fd54e9-5b07-4371-867d-6ec5aa7526ed-assistant-2-1750560291049',
      data: {
        call_id: 'tool_57382318',
        tool_name: 'agentic_web_search',
        result: {
          error: "Failed to spawn agent: [Errno 2] No such file or directory: './agent_configs/'",
          query: 'moon bowls in San Francisco'
        },
        success: false
      }
    }
  }),

  // 6. Second think tool call
  JSON.stringify({
    type: 'agent_event',
    payload: {
      event_id: 'evt_006',
      session_id: '12fd54e9-5b07-4371-867d-6ec5aa7526ed',
      event_type: 'tool_call',
      timestamp: Date.now(),
      message_id: 'acs_todo_12fd54e9-5b07-4371-867d-6ec5aa7526ed-assistant-3-1750560295302',
      data: {
        call_id: 'tool_cd32ea63',
        tool_name: 'think',
        tool_input: {
          thought: 'The previous attempt with agentic_web_search failed due to an environment issue. I will now use exa_search to find information about "moon bowls in San Francisco".'
        }
      }
    }
  }),

  // 7. Second think tool result
  JSON.stringify({
    type: 'agent_event',
    payload: {
      event_id: 'evt_007',
      session_id: '12fd54e9-5b07-4371-867d-6ec5aa7526ed',
      event_type: 'tool_result',
      timestamp: Date.now(),
      message_id: 'acs_todo_12fd54e9-5b07-4371-867d-6ec5aa7526ed-assistant-3-1750560295302',
      data: {
        call_id: 'tool_cd32ea63',
        tool_name: 'think',
        result: { message: 'Your thought has been logged.', success: true },
        success: true
      }
    }
  }),

  // 8. exa_search tool call
  JSON.stringify({
    type: 'agent_event',
    payload: {
      event_id: 'evt_008',
      session_id: '12fd54e9-5b07-4371-867d-6ec5aa7526ed',
      event_type: 'tool_call',
      timestamp: Date.now(),
      message_id: 'acs_todo_12fd54e9-5b07-4371-867d-6ec5aa7526ed-assistant-4-1750560298891',
      data: {
        call_id: 'tool_f1be0cc4',
        tool_name: 'exa_search',
        tool_input: {
          query: 'Moonbowls San Francisco restaurant',
          num_results: 5,
          include_content: true
        }
      }
    }
  }),

  // 9. exa_search tool result (success with real data)
  JSON.stringify({
    type: 'agent_event',
    payload: {
      event_id: 'evt_009',
      session_id: '12fd54e9-5b07-4371-867d-6ec5aa7526ed',
      event_type: 'tool_result',
      timestamp: Date.now(),
      message_id: 'acs_todo_12fd54e9-5b07-4371-867d-6ec5aa7526ed-assistant-4-1750560298891',
      data: {
        call_id: 'tool_f1be0cc4',
        tool_name: 'exa_search',
        result: {
          success: true,
          results: [
            {
              title: 'MOONBOWLS - Updated June 2025 - 130 Photos & 189 Reviews',
              url: 'https://www.yelp.com/biz/moonbowls-san-francisco',
              text: 'Menu Popular Dishes People also searched for Location & Hours Mon 10:00 AM - 10:00 PM...'
            },
            {
              title: 'moonbowls',
              url: 'https://www.moonbowls.com/',
              text: 'A new way to order moonbowls! We believe in food that\'s clean, craveable, and leaves you feeling great...'
            }
          ]
        },
        success: true
      }
    }
  }),

  // 10. Assistant response chunk before file creation
  JSON.stringify({
    type: 'agent_event',
    payload: {
      event_id: 'evt_010',
      session_id: '12fd54e9-5b07-4371-867d-6ec5aa7526ed',
      event_type: 'chunk',
      timestamp: Date.now(),
      message_id: 'acs_todo_12fd54e9-5b07-4371-867d-6ec5aa7526ed-assistant-5-1750560317664',
      data: {
        text: 'Okay, based on the research, "moon bowls" in San Francisco most prominently refers to **Moonbowls**, a specific food service.\n\nHere\'s a plan to create the document:\n\n1. **Synthesize information:** Consolidate the key findings about Moonbowls.\n2. **Draft content:** Write a brief markdown document...'
      }
    }
  }),

  // 11. str_replace_editor tool call
  JSON.stringify({
    type: 'agent_event',
    payload: {
      event_id: 'evt_011',
      session_id: '12fd54e9-5b07-4371-867d-6ec5aa7526ed',
      event_type: 'tool_call',
      timestamp: Date.now(),
      message_id: 'acs_todo_12fd54e9-5b07-4371-867d-6ec5aa7526ed-assistant-5-1750560317664',
      data: {
        call_id: 'tool_3a263162',
        tool_name: 'str_replace_editor',
        tool_input: {
          path: '/tmp/moon_bowls_sf_summary.md',
          command: 'create',
          file_text: '# Moonbowls in San Francisco\n\n"Moon bowls" in San Francisco primarily refers to **Moonbowls**, a food service focusing on healthy, customizable bowls...'
        }
      }
    }
  }),

  // 12. str_replace_editor tool result
  JSON.stringify({
    type: 'agent_event',
    payload: {
      event_id: 'evt_012',
      session_id: '12fd54e9-5b07-4371-867d-6ec5aa7526ed',
      event_type: 'tool_result',
      timestamp: Date.now(),
      message_id: 'acs_todo_12fd54e9-5b07-4371-867d-6ec5aa7526ed-assistant-5-1750560317664',
      data: {
        call_id: 'tool_3a263162',
        tool_name: 'str_replace_editor',
        result: {
          job_id: 'tool_3a263162',
          status: 'success',
          result_payload: {
            result: "File created successfully at: /tmp/moon_bowls_sf_summary.md"
          }
        },
        success: true
      }
    }
  }),

  // 13. Final assistant response chunks
  JSON.stringify({
    type: 'agent_event',
    payload: {
      event_id: 'evt_013',
      session_id: '12fd54e9-5b07-4371-867d-6ec5aa7526ed',
      event_type: 'chunk',
      timestamp: Date.now(),
      message_id: 'acs_todo_12fd54e9-5b07-4371-867d-6ec5aa7526ed-assistant-6-1750560322941',
      data: {
        text: 'I have successfully researched "moon bowls" in San Francisco and created a brief document summarizing the findings.\n\n**Summary of Findings:**\n\n* "Moon bowls" in San Francisco primarily refers to **Moonbowls**, a specific food service brand.'
      }
    }
  }),

  // 14. More final response chunks
  JSON.stringify({
    type: 'agent_event',
    payload: {
      event_id: 'evt_014',
      session_id: '12fd54e9-5b07-4371-867d-6ec5aa7526ed',
      event_type: 'chunk',
      timestamp: Date.now(),
      message_id: 'acs_todo_12fd54e9-5b07-4371-867d-6ec5aa7526ed-assistant-6-1750560322941',
      data: {
        text: '\n* They are a **delivery-first** concept, likely operating from cloud kitchens.\n* Their food philosophy centers on **clean, craveable, vegetable-forward, and 100% gluten-free** meals.\n* The menu includes **Signature Bowls**, **build-your-own bowls**, plates, appetizers, and salads.'
      }
    }
  }),

  // 15. Final chunk
  JSON.stringify({
    type: 'agent_event',
    payload: {
      event_id: 'evt_015',
      session_id: '12fd54e9-5b07-4371-867d-6ec5aa7526ed',
      event_type: 'chunk',
      timestamp: Date.now(),
      message_id: 'acs_todo_12fd54e9-5b07-4371-867d-6ec5aa7526ed-assistant-6-1750560322941',
      data: {
        text: '\n\nThe document has been saved to `/tmp/moon_bowls_sf_summary.md`.\n\nIs there anything else I can help you with regarding this topic?'
      }
    }
  }),

  // 16. Done event
  JSON.stringify({
    type: 'agent_event',
    payload: {
      event_id: 'evt_016',
      session_id: '12fd54e9-5b07-4371-867d-6ec5aa7526ed',
      event_type: 'done',
      timestamp: Date.now(),
      message_id: 'acs_todo_12fd54e9-5b07-4371-867d-6ec5aa7526ed-assistant-6-1750560322941',
      data: {}
    }
  })
];