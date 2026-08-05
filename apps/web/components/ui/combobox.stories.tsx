import { expect, fn, userEvent, waitFor, within } from "storybook/test"
// Replace nextjs-vite with the name of your framework
import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@/components/ui/combobox"

interface ProduceGroup {
  value: string
  items: string[]
}

const produceGroups: ProduceGroup[] = [
  {
    value: "Fruits",
    items: ["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"],
  },
  {
    value: "Vegetables",
    items: ["Aubergine", "Broccoli", "Carrot", "Courgette", "Leek"],
  },
  {
    value: "Meat",
    items: ["Beef", "Chicken", "Lamb", "Pork"],
  },
]

/**
 * Combines a text input with a list of options for the user to pick from.
 *
 * Filtering is driven by the `items` prop passed to `Combobox`, so options
 * must be provided as data (via `Combobox.Group`/`Combobox.Collection`)
 * rather than static children — otherwise typing in the input won't filter
 * anything.
 */
const meta: Meta<typeof Combobox> = {
  title: "ui/base/Combobox",
  component: Combobox,
  tags: ["autodocs"],
  argTypes: {},
  args: {
    items: produceGroups,
    onValueChange: fn(),
  },
  render: (args) => (
    <Combobox {...args}>
      <ComboboxInput placeholder="Select a fruit" className="w-96" />
      <ComboboxContent>
        <ComboboxEmpty>No results found.</ComboboxEmpty>
        <ComboboxList>
          {(group: ProduceGroup) => (
            <ComboboxGroup key={group.value} items={group.items}>
              <ComboboxLabel>{group.value}</ComboboxLabel>
              <ComboboxCollection>
                {(item: string) => (
                  <ComboboxItem
                    key={item}
                    value={item}
                    disabled={item === "Carrot"}
                  >
                    {item}
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxGroup>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  ),
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Combobox>

export default meta

type Story = StoryObj<typeof meta>

/**
 * The default form of the combobox.
 */
export const Default: Story = {}

export const ShouldFilterOptions: Story = {
  name: "when typing, should filter options",
  tags: ["!dev", "!autodocs"],
  play: async ({ canvasElement, step }) => {
    const canvasBody = within(canvasElement.ownerDocument.body)
    const combobox = await canvasBody.findByRole("combobox")

    await step("open and type a query", async () => {
      await userEvent.click(combobox)
      await userEvent.type(combobox, "ban")
      await waitFor(async () => {
        const options = await canvasBody.findAllByRole("option")
        expect(options).toHaveLength(1)
        expect(options[0]).toHaveTextContent(/banana/i)
      })
    })
  },
}

export const ShouldSelectOption: Story = {
  name: "when an option is selected, should be checked",
  tags: ["!dev", "!autodocs"],
  play: async ({ canvasElement, step }) => {
    const canvasBody = within(canvasElement.ownerDocument.body)
    const combobox = await canvasBody.findByRole("combobox")

    await step("open and select item", async () => {
      await userEvent.click(combobox)
      await userEvent.click(
        await canvasBody.findByRole("option", { name: /banana/i })
      )
      await waitFor(() => {
        expect(combobox).toHaveValue("Banana")
      })
    })

    await step("verify the selected option", async () => {
      await userEvent.click(combobox)
      const options = await canvasBody.findAllByRole("option")
      const selectedOption = options.find(
        (option) =>
          option.getAttribute("aria-selected") === "true" &&
          /banana/i.test(option.textContent ?? "")
      )
      expect(selectedOption).toBeDefined()
    })
  },
}
