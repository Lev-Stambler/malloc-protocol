import React, { useCallback } from "react";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { Modal, Form, Input, Button, Checkbox, Select } from "antd";
import { serializePubkey } from "../../utils/utils";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { useMalloc } from "../../contexts/malloc";

const { Option } = Select;

export interface RegisterCallModalProps {
  isVisible: boolean;
  onCancel: () => void;
  onOk: () => void;
}

export function RegisterCallModal(props: RegisterCallModalProps) {
  const malloc = useMalloc();
  const { isVisible, onCancel, onOk } = props;

  const onFinish = useCallback(
    async (value: any) => {
      console.log(malloc, value);
      const { name, progId, input, associated_accounts } = value.call;
      const wcallPubkey = new PublicKey(progId);
      const associatedAccountsPubkeys = (associated_accounts || []).map(
        (key) => new PublicKey(key)
      );
      const insns: TransactionInstruction[] = [];
      insns.push(
        malloc.registerCall({
          call_name: name,
          wcall: {
            Simple: {
              wcall: wcallPubkey,
              input: input,
              associated_accounts: associatedAccountsPubkeys,
              // TODO: add in
              associated_account_is_signer: [],
              associated_account_is_writable: []
            },
          },
        })
      );
      await malloc.sendMallocTransaction(insns, []);
    },
    [malloc]
  );

  return (
    <Modal title="New Call" visible={isVisible} onOk={onOk} onCancel={onCancel}>
      <Form {...layout} name="register-call" onFinish={onFinish}>
        <Form.Item
          name={["call", "name"]}
          label="Call name"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name={["call", "input"]}
          label="Call input name"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name={["call", "progId"]}
          label="Call program ID"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name={["call", "description"]}
          label="Call description"
          rules={[{ required: true }]}
        >
          <Input.TextArea />
        </Form.Item>
        <Form.List name={["call", "associated_accounts"]}>
          {(fields, { add, remove }, { errors }) => (
            <>
              {fields.map((field, index) => (
                <Form.Item
                  // {...(index === 0
                  //   ? formItemLayout
                  //   : formItemLayoutWithOutLabel)}
                  label={index === 0 ? "Associated Accounts" : ""}
                  required={false}
                  key={field.key}
                >
                  <Form.Item
                    {...field}
                    name="pubkey"
                    validateTrigger={["onChange", "onBlur"]}
                    rules={[
                      {
                        required: true,
                        whitespace: true,
                        message: "Please input the associated account pubkey",
                      },
                    ]}
                  >
                    <Input
                      placeholder="associate account PublicKey"
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                  {/* <Form.Item
                    name="isWriteable"
                    label="Writeable"
                    rules={[{ required: true }]}
                  >
                    <Select
                    defaultValue={0}
                      // onChange={onGenderChange}
                    >
                      <Option value={0}>false</Option>
                      <Option value={1}>true</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item
                    name="isSigner"
                    label="Signer"
                    rules={[{ required: true }]}
                  >
                    <Select
                    defaultValue={0}
                      // onChange={onGenderChange}
                    >
                      <Option value={0}>false</Option>
                      <Option value={1}>true</Option>
                    </Select>
                  </Form.Item> */}
                  {fields.length > 1 ? (
                    <MinusCircleOutlined
                      className="dynamic-delete-button"
                      onClick={() => remove(field.name)}
                    />
                  ) : null}
                </Form.Item>
              ))}
              <Form.Item>
                <Button
                  type="dashed"
                  onClick={() => add()}
                  style={{ width: "60%" }}
                  icon={<PlusOutlined />}
                >
                  Associated Account
                </Button>
                <Form.ErrorList errors={errors} />
              </Form.Item>
            </>
          )}
        </Form.List>
        <Form.Item wrapperCol={{ ...layout.wrapperCol, offset: 8 }}>
          <Button type="primary" htmlType="submit">
            Ok
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}

const layout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 },
};
